"use strict";

// Offline Google sign-in checks. Supabase is stubbed; Orbit's routes run for real.

const assert = require("node:assert/strict");

const SUPABASE_URL = "https://orbit-test.supabase.co";
const USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const PORT = 3178;

process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = "sb_publishable_test_anon_key";
process.env.PORT = String(PORT);
process.env.AI_PROVIDER = "gemini";
process.env.AI_API_KEY = "test-gemini-key";
delete process.env.ORBIT_FORCE_TIER;
delete process.env.RAZORPAY_KEY_ID;
delete process.env.RAZORPAY_KEY_SECRET;

const { server } = require("../server.js");
const realFetch = globalThis.fetch;
let lastPkceBody = null;

globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.startsWith("http://127.0.0.1")) return realFetch(url, options);
  if (target.startsWith(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`)) {
    lastPkceBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      access_token: "google-access-token",
      refresh_token: "google-refresh-token",
      expires_in: 3600,
      user: { id: USER_ID, email: "learner@gmail.com", app_metadata: { provider: "google" } }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (target.startsWith(`${SUPABASE_URL}/auth/v1/user`)) {
    return new Response(JSON.stringify({ id: USER_ID, email: "learner@gmail.com" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (target.startsWith(`${SUPABASE_URL}/rest/v1/learner_plan`)) {
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (target.startsWith(`${SUPABASE_URL}/rest/v1/learner_state`)) {
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  }
  if (target.startsWith(`${SUPABASE_URL}/auth/v1/logout`)) {
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }
  throw new Error(`Unexpected outbound call in the auth test: ${target}`);
};

async function get(pathname) {
  const response = await realFetch(`http://127.0.0.1:${PORT}${pathname}`);
  return { status: response.status, payload: await response.json(), headers: response.headers };
}

async function post(pathname, body, cookie = "") {
  const response = await realFetch(`http://127.0.0.1:${PORT}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body)
  });
  return { status: response.status, payload: await response.json().catch(() => null), headers: response.headers };
}

function cookieOf(response) {
  return (response.headers.getSetCookie?.() || []).map((part) => part.split(";")[0]).join("; ");
}

async function main() {
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  try {
    const wrongProvider = await get("/api/auth/oauth/start?provider=github&code_challenge=abc");
    assert.equal(wrongProvider.status, 400, "an unconfigured provider is refused");
    assert.equal(wrongProvider.payload.code, "OAUTH_PROVIDER_UNSUPPORTED");

    const badChallenge = await get("/api/auth/oauth/start?provider=google&code_challenge=not-valid!");
    assert.equal(badChallenge.status, 400, "a malformed PKCE challenge is refused");
    assert.equal(badChallenge.payload.code, "OAUTH_CHALLENGE_INVALID");

    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    const start = await get(`/api/auth/oauth/start?provider=google&code_challenge=${challenge}&redirect_to=https://evil.example/steal`);
    assert.equal(start.status, 200, `sign-in start should succeed: ${JSON.stringify(start.payload)}`);
    const authorize = new URL(start.payload.authorizeUrl);
    assert.equal(authorize.origin, SUPABASE_URL, "the browser is sent to Supabase, nowhere else");
    assert.equal(authorize.pathname, "/auth/v1/authorize");
    assert.equal(authorize.searchParams.get("provider"), "google");
    assert.equal(authorize.searchParams.get("code_challenge"), challenge);
    assert.equal(authorize.searchParams.get("code_challenge_method"), "s256");
    assert.equal(authorize.searchParams.get("redirect_to"), `http://127.0.0.1:${PORT}/`, "the caller's redirect_to is ignored");

    const missingVerifier = await post("/api/auth/oauth/complete", { code: "auth-code-1" });
    assert.equal(missingVerifier.status, 400, "the exchange needs the verifier the browser generated");

    const done = await post("/api/auth/oauth/complete", { code: "auth-code-1", codeVerifier: "x".repeat(56) });
    assert.equal(done.status, 200, `the code exchange should succeed: ${JSON.stringify(done.payload)}`);
    assert.equal(done.payload.user.email, "learner@gmail.com");
    assert.equal(done.payload.user.provider, "google");
    assert.equal(lastPkceBody.auth_code, "auth-code-1", "the code is forwarded to Supabase");
    assert.equal(lastPkceBody.code_verifier, "x".repeat(56), "the verifier is forwarded unchanged");
    const cookie = cookieOf(done);
    assert.ok(cookie.includes("orbit_access=google-access-token"), "the session cookie is set on sign-in");

    const account = await get("/api/account");
    assert.equal(account.payload.user, null, "without the cookie there is no account");

    const status = await realFetch(`http://127.0.0.1:${PORT}/api/status`, { headers: { Cookie: cookie } });
    const statusPayload = await status.json();
    assert.equal(statusPayload.tier, "free", "a fresh Google account starts on the free plan");

    const signedAccount = await realFetch(`http://127.0.0.1:${PORT}/api/account`, { headers: { Cookie: cookie } });
    const accountPayload = await signedAccount.json();
    assert.equal(accountPayload.user.id, USER_ID, "the cookie authenticates the next request");

    const signedOut = await post("/api/auth/logout", {}, cookie);
    assert.equal(signedOut.status, 200);
    assert.ok(cookieOf(signedOut).includes("orbit_access=;"), "sign out clears the session cookie");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    globalThis.fetch = realFetch;
  }
  console.log("Auth checks passed: Google PKCE start, code exchange, session cookie, plan lookup and sign out.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
