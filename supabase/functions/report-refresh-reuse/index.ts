// report-refresh-reuse: public endpoint (verify_jwt=false) that proxies a
// "refresh_reuse" signal from the client to the Hub. The client only sends
// { email }; the client_secret is injected server-side. Fail-open: response
// is always 200 to avoid leaking timing/state info.

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

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }
    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (email && HUB_BASE_URL && SSO_CLIENT_SECRET) {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 3000);
      try {
        await fetch(`${HUB_BASE_URL}/api/public/security-report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_secret: SSO_CLIENT_SECRET,
            app_slug: APP_SLUG,
            email,
            signal_type: "refresh_reuse",
            details: {},
          }),
          signal: ctl.signal,
        }).catch(() => null);
      } finally {
        clearTimeout(t);
      }
    }
  } catch (e) {
    console.error("report-refresh-reuse error", e);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
});