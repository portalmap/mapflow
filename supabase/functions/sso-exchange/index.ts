// SSO exchange: trades a Hub authorization code for a local Supabase session.
// Public function (verify_jwt=false). client_secret only used server-to-server.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_ROLES = new Set([
  "administrador_global",
  "administrador",
  "gestor",
  "membro",
  "convidado",
]);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HUB_SSO_REDEEM_URL = Deno.env.get("HUB_SSO_REDEEM_URL") ?? "";
const SSO_CLIENT_SECRET = Deno.env.get("SSO_CLIENT_SECRET") ?? "";
const APP_SLUG = Deno.env.get("APP_SLUG") ?? "map-flow";

function corsHeaders(origin: string | null): HeadersInit {
  // Restrict CORS to known, allowed origins only. No wildcard.
  // Allowed: server-to-server (no Origin), local dev, Lovable preview domains,
  // and the published domain. All suffix checks are anchored at the end
  // of the hostname to prevent malicious subdomains like
  // lovableproject.com.evil.com.
  const allowed = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // server-to-server or no Origin header
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const hostname = url.hostname;
  if (hostname === "localhost") return true;
  if (hostname === "127.0.0.1") return true;
  // Anchored suffix checks only:
  if (/\.lovable\.app$/.test(hostname)) return true;
  if (/\.lovableproject\.com$/.test(hostname)) return true;
  // Exact published domain:
  if (hostname === "mapflow.lovable.app") return true;
  return false;
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

// Find a user by email reliably. Avoids relying on listUsers() first page.
async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const target = email.trim().toLowerCase();

  // 1. Direct lookup by email via the profiles table (cheapest, exact).
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", target)
    .maybeSingle();
  if (profile?.id) {
    return { id: profile.id as string, email: target };
  }

  // 2. Fallback: paginate auth admin users until we either find the email
  //    or exhaust the list. Never trust just the first page.
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return { id: hit.id, email: target };
    if (users.length < perPage) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, origin);
  }

  if (!HUB_SSO_REDEEM_URL || !SSO_CLIENT_SECRET) {
    return json(
      { error: "SSO not configured (HUB_SSO_REDEEM_URL / SSO_CLIENT_SECRET missing)" },
      500,
      origin,
    );
  }

  let body: { code?: unknown; redirect_to?: unknown; fingerprint?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, origin);
  }

  const code = typeof body.code === "string" ? body.code.trim() : "";
  const redirectTo =
    typeof body.redirect_to === "string" ? body.redirect_to : undefined;
  const fingerprint =
    typeof body.fingerprint === "string" ? body.fingerprint : "";
  if (!code) return json({ error: "Missing code" }, 400, origin);

  // Capture external IP from the request (browser cannot know this).
  const xff = req.headers.get("x-forwarded-for");
  const baselineIp =
    (xff ? xff.split(",")[0]!.trim() : "") ||
    req.headers.get("x-real-ip") ||
    null;

  // 1. Redeem code at the Hub (server-to-server).
  let hubResp: Response;
  try {
    hubResp = await fetch(HUB_SSO_REDEEM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_secret: SSO_CLIENT_SECRET,
        app: APP_SLUG,
      }),
    });
  } catch (e) {
    console.error("Hub redeem network error", e);
    return json({ error: "Hub unreachable" }, 502, origin);
  }

  if (!hubResp.ok) {
    const txt = await hubResp.text().catch(() => "");
    console.error("Hub redeem failed", hubResp.status, txt);
    return json(
      { error: `Hub rejected code (${hubResp.status})` },
      401,
      origin,
    );
  }

  let payload: {
    user?: Record<string, unknown>;
    role?: string;
    app?: string;
  };
  try {
    payload = await hubResp.json();
  } catch {
    return json({ error: "Invalid Hub response" }, 502, origin);
  }

  const hubUser = (payload.user ?? {}) as Record<string, unknown>;

  // Aceita as variações de nome de campo que o Hub pode usar.
  const pick = (keys: string[]): string | null => {
    for (const k of keys) {
      const v = hubUser[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };

  const email = (pick(["email", "e_mail"]) ?? "").toLowerCase();
  const fullName = pick(["nome", "name", "full_name", "nome_completo", "display_name"]) ?? "";
  // Signed Hub URL — valid for only 7 days. Never persist it.
  const hubAvatarUrl = pick([
    "avatar_url",
    "avatar",
    "foto_url",
    "foto",
    "photo_url",
    "picture",
    "image_url",
  ]);
  const hubAvatarPath = pick(["avatar_path", "foto_path", "avatar_key"]);
  const hubUserId = pick(["id", "user_id", "hub_user_id"]);
  const role = (payload.role ?? "").trim();

  // Diagnóstico (sem dados sensíveis): quais campos o Hub realmente mandou.
  console.log(
    "hub payload fields",
    JSON.stringify({
      keys: Object.keys(hubUser).sort(),
      has_name: !!fullName,
      has_avatar_url: !!hubAvatarUrl,
      has_avatar_path: !!hubAvatarPath,
    }),
  );

  if (!email) return json({ error: "Hub did not return email" }, 502, origin);
  if (payload.app && payload.app !== APP_SLUG) {
    return json({ error: `Wrong app slug: ${payload.app}` }, 400, origin);
  }
  if (!ALLOWED_ROLES.has(role)) {
    // Loud failure: never create a session for an unknown role.
    return json({ error: `Invalid role from Hub: "${role}"` }, 400, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Reliable lookup by email; create only if truly absent.
  let existing = await findUserByEmail(admin, email);
  if (!existing) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
      },
    });
    if (createErr || !created?.user) {
      // Race: someone else may have just created them. Re-query.
      existing = await findUserByEmail(admin, email);
      if (!existing) {
        console.error("createUser failed", createErr);
        return json(
          { error: createErr?.message ?? "Could not create user" },
          500,
          origin,
        );
      }
    } else {
      existing = { id: created.user.id, email };
    }
  }

  // 3. Upsert profile (id-based to keep FK happy; email is the natural key).
  //    Only fields that actually came filled are written — never blank out data.
  const profilePayload: Record<string, unknown> = {
    id: existing.id,
    email,
    role_slug: role,
  };
  if (fullName) profilePayload.full_name = fullName;
  if (hubUserId) profilePayload.hub_user_id = hubUserId;

  const { error: upsertErr } = await admin
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });
  if (upsertErr) {
    console.error("profile upsert failed", upsertErr);
    return json({ error: "Could not upsert profile" }, 500, origin);
  }

  // 3a. Sincroniza a FOTO do Hub para o storage local (bucket privado "avatars").
  //     Totalmente isolado: qualquer falha só loga e o login continua.
  try {
    if (hubAvatarUrl) {
      // Chave de idempotência: caminho do Hub quando existir; senão, a URL de
      // origem sem a assinatura (query string), que muda a cada renovação.
      let sourceKey = hubAvatarPath;
      if (!sourceKey) {
        try {
          const u = new URL(hubAvatarUrl);
          sourceKey = `hub:${u.origin}${u.pathname}`;
        } catch {
          sourceKey = `hub:${hubAvatarUrl.split("?")[0]}`;
        }
      }

      const { data: current } = await admin
        .from("profiles")
        .select("avatar_path, avatar_url, avatar_origem")
        .eq("id", existing.id)
        .maybeSingle();

      const origem = (current?.avatar_origem as string | null) ?? "hub";
      const savedPath = (current?.avatar_path as string | null) ?? null;
      const savedUrl = (current?.avatar_url as string | null) ?? null;

      if (origem !== "local" && (savedPath !== sourceKey || !savedUrl)) {
        const resp = await fetch(hubAvatarUrl);
        if (!resp.ok) throw new Error(`avatar download failed: ${resp.status}`);
        const contentType = resp.headers.get("content-type") ?? "";
        if (!contentType.startsWith("image/")) {
          throw new Error(`avatar not an image: ${contentType}`);
        }
        const bytes = new Uint8Array(await resp.arrayBuffer());
        if (bytes.byteLength > 5 * 1024 * 1024) {
          throw new Error("avatar larger than 5MB");
        }

        const ext = contentType === "image/png"
          ? "png"
          : contentType === "image/webp"
          ? "webp"
          : contentType === "image/gif"
          ? "gif"
          : "jpg";
        const localPath = `${existing.id}/${Date.now()}.${ext}`;

        const { error: upErr } = await admin.storage
          .from("avatars")
          .upload(localPath, bytes, { contentType, upsert: true });
        if (upErr) throw upErr;

        const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
        const { data: signed, error: signErr } = await admin.storage
          .from("avatars")
          .createSignedUrl(localPath, TEN_YEARS);
        if (signErr || !signed?.signedUrl) {
          throw signErr ?? new Error("could not sign avatar url");
        }

        const { error: avatarErr } = await admin
          .from("profiles")
          .update({
            avatar_url: signed.signedUrl,
            avatar_path: hubAvatarPath,
            avatar_origem: "hub",
          })
          .eq("id", existing.id);
        if (avatarErr) throw avatarErr;
      }
    }
  } catch (e) {
    console.error("hub avatar sync failed (non-fatal)", e);
  }

  // 3b. Sincroniza o papel do Hub para o sistema local de permissões (user_roles).
  //     administrador_global -> global_owner, administrador -> admin.
  //     Não-fatal: se falhar, o login continua, mas o admin perceberá na UI.
  try {
    const { error: syncErr } = await admin.rpc("sync_hub_role_to_app_roles", {
      _user_id: existing.id,
      _role_slug: role,
    });
    if (syncErr) console.error("sync_hub_role_to_app_roles failed", syncErr);
  } catch (e) {
    console.error("sync_hub_role_to_app_roles threw", e);
  }

  // 4. Generate a magic-link OTP for the client to verify -> establishes session.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("generateLink failed", linkErr);
    return json({ error: "Could not issue session token" }, 500, origin);
  }

  // 5. Upsert session_context baseline (IP + fingerprint + login_at).
  try {
    await admin
      .from("session_context")
      .upsert(
        {
          user_id: existing.id,
          email,
          baseline_ip: baselineIp,
          baseline_fingerprint: fingerprint || null,
          login_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
  } catch (e) {
    console.error("session_context upsert failed", e);
    // Non-fatal: continue issuing the session.
  }

  return json(
    {
      email,
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    },
    200,
    origin,
  );
});