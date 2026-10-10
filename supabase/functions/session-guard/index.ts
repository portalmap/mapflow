// session-guard: validates the current local session against local baseline
// (IP + fingerprint) and the Hub's session-status. Fail-open by design:
// Hub network errors or internal errors NEVER force a logout. Only:
//   - strong local signal (ip/fingerprint mismatch), or
//   - explicit { revoked: true } from the Hub
// produce action="logout".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HUB_BASE_URL = (Deno.env.get("HUB_BASE_URL") ?? "").replace(/\/+$/, "");
const SSO_CLIENT_SECRET = Deno.env.get("SSO_CLIENT_SECRET") ?? "";
const APP_SLUG = Deno.env.get("APP_SLUG") ?? "map-flow";

// Lista única de origens permitidas (CORS) — manter igual em sso-exchange,
// session-guard, report-refresh-reuse e hub-inbox.
// Domínios extras: secret ALLOWED_ORIGINS (separados por vírgula).
const FIXED_ALLOWED_HOSTS = new Set([
  "flow.assessoriamap.com.br",
  "mapflow.lovable.app",
  "localhost",
  "127.0.0.1",
]);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // servidor-servidor
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const h = url.hostname;
  if (FIXED_ALLOWED_HOSTS.has(h)) return true;
  if (/\.lovable\.app$/.test(h)) return true;
  if (/\.lovableproject\.com$/.test(h)) return true;
  const extra = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return extra.some((o) => {
    try {
      return new URL(o.includes("://") ? o : `https://${o}`).hostname === h;
    } catch {
      return false;
    }
  });
}

function corsHeaders(origin: string | null): HeadersInit {
  const allowed = isAllowedOrigin(origin);
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function getClientIp(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim() || null;
  return req.headers.get("x-real-ip");
}

async function postHub(path: string, body: unknown, timeoutMs = 3000) {
  if (!HUB_BASE_URL || !SSO_CLIENT_SECRET) return null;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${HUB_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ action: "continue" }, 200, origin);
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ action: "continue" }, 200, origin);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      // Can't identify user; fail-open.
      return json({ action: "continue" }, 200, origin);
    }
    const user = userData.user;
    const email = (user.email ?? "").toLowerCase();

    let fingerprint = "";
    try {
      const body = await req.json();
      fingerprint = typeof body?.fingerprint === "string" ? body.fingerprint : "";
    } catch {
      /* ignore */
    }

    const currentIp = getClientIp(req);

    const { data: ctx } = await admin
      .from("session_context")
      .select("baseline_ip, baseline_fingerprint, login_at")
      .eq("user_id", user.id)
      .maybeSingle();

    let strongSignal: string | null = null;
    if (ctx?.baseline_ip && currentIp && ctx.baseline_ip !== currentIp) {
      strongSignal = "ip_change";
    } else if (
      ctx?.baseline_fingerprint &&
      fingerprint &&
      ctx.baseline_fingerprint !== fingerprint
    ) {
      strongSignal = "fingerprint_change";
    }

    // Hub check (rede de segurança, fail-open)
    const since = ctx?.login_at ?? new Date(0).toISOString();
    const hubStatus = email
      ? await postHub("/api/public/session-status", {
          client_secret: SSO_CLIENT_SECRET,
          app_slug: APP_SLUG,
          email,
          since,
        })
      : null;
    const hubRevoked = !!(hubStatus && (hubStatus as any).revoked === true);

    if (strongSignal) {
      // Reportar para todos os apps (fire and forget, ainda assim fail-open).
      await postHub("/api/public/security-report", {
        client_secret: SSO_CLIENT_SECRET,
        app_slug: APP_SLUG,
        email,
        signal_type: strongSignal,
        details: {
          baseline_ip: ctx?.baseline_ip ?? null,
          current_ip: currentIp,
          baseline_fingerprint: ctx?.baseline_fingerprint ?? null,
          current_fingerprint: fingerprint || null,
        },
      });
      return json({ action: "logout", reason: strongSignal }, 200, origin);
    }

    if (hubRevoked) {
      return json({ action: "logout", reason: "hub_revoked" }, 200, origin);
    }

    return json({ action: "continue" }, 200, origin);
  } catch (e) {
    console.error("session-guard error", e);
    // Internal error -> fail-open.
    return json({ action: "continue" }, 200, origin);
  }
});