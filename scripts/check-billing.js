"use strict";

// Offline Razorpay + plan verification. No real payment call leaves this process:
// Supabase and the Razorpay API are stubbed, Orbit's own HTTP routes run for real.

const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const SUPABASE_URL = "https://orbit-test.supabase.co";
const RAZORPAY_SECRET = "test-key-secret";
const WEBHOOK_SECRET = "test-webhook-secret";
const USER_ID = "11111111-2222-3333-4444-555555555555";
const OTHER_USER_ID = "66666666-7777-8888-9999-000000000000";

process.env.SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_ANON_KEY = "sb_publishable_test_anon_key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.RAZORPAY_KEY_ID = "rzp_test_1234567890";
process.env.RAZORPAY_KEY_SECRET = RAZORPAY_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.AI_PROVIDER = "gemini";
process.env.AI_API_KEY = "test-gemini-key";
process.env.PAID_EMAILS = "";
// The API host allowlist is built from PORT, so the test server must listen on exactly that port.
process.env.PORT = "3177";
delete process.env.ORBIT_FORCE_TIER;

const { billingPlans, billingPlanList, razorpaySignatureMatches, activePlanFrom, server } = require("../server.js");

const realFetch = globalThis.fetch;
const orders = new Map();
const plans = new Map();
const trials = new Map();
let lastOrderRequest = null;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

globalThis.fetch = async (url, options = {}) => {
  const target = String(url);
  if (target.startsWith("http://127.0.0.1")) return realFetch(url, options);
  const body = options.body ? JSON.parse(options.body) : null;

  if (target.startsWith(`${SUPABASE_URL}/auth/v1/token`)) {
    return jsonResponse({
      access_token: "test-access-token",
      refresh_token: "test-refresh-token",
      expires_in: 3600,
      user: { id: USER_ID, email: "learner@orbit.test" }
    });
  }
  if (target.startsWith(`${SUPABASE_URL}/auth/v1/user`)) {
    return jsonResponse({ id: USER_ID, email: "learner@orbit.test" });
  }
  if (target.startsWith(`${SUPABASE_URL}/rest/v1/learner_trial?on_conflict`)) {
    assert.equal(options.headers.Authorization, "Bearer test-service-role-key", "the trial clock is written with the service key, not the learner's token");
    trials.set(body.user_id, { started_at: body.started_at });
    return jsonResponse([], 201);
  }
  if (target.startsWith(`${SUPABASE_URL}/rest/v1/learner_trial`)) {
    const id = decodeURIComponent(target.match(/user_id=eq\.([^&]+)/)?.[1] || "");
    const row = trials.get(id);
    return jsonResponse(row ? [row] : []);
  }
  if (target.startsWith(`${SUPABASE_URL}/rest/v1/learner_plan?on_conflict`)) {
    plans.set(body.user_id, { ...body });
    return jsonResponse([], 201);
  }
  if (target.startsWith(`${SUPABASE_URL}/rest/v1/learner_plan`)) {
    const row = plans.get(USER_ID);
    return jsonResponse(row ? [row] : []);
  }
  if (target === "https://api.razorpay.com/v1/orders") {
    lastOrderRequest = body;
    const order = { id: "order_test_1", entity: "order", ...body };
    orders.set(order.id, order);
    return jsonResponse(order);
  }
  if (target.startsWith("https://api.razorpay.com/v1/orders/")) {
    const order = orders.get(target.split("/").pop());
    return order ? jsonResponse(order) : jsonResponse({ error: { description: "no such order" } }, 404);
  }
  if (target.startsWith("https://api.razorpay.com/v1/payments/")) {
    const id = target.split("/").pop();
    return jsonResponse({ id, entity: "payment", order_id: "order_test_1", status: "captured" });
  }
  throw new Error(`Unexpected outbound call in the billing test: ${target}`);
};

function signature(data, secret = RAZORPAY_SECRET) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

async function request(pathname, { method = "GET", body, cookie = "", headers = {} } = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers
    },
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined
  });
  return { status: response.status, payload: await response.json().catch(() => null), headers: response.headers };
}

let port = Number(process.env.PORT) || 3177;

async function checkSignatureHelper() {
  const data = "order_test_1|pay_test_1";
  const good = signature(data);
  assert.equal(razorpaySignatureMatches(RAZORPAY_SECRET, data, good), true, "a real Razorpay signature verifies");
  assert.equal(razorpaySignatureMatches(RAZORPAY_SECRET, data, good.toUpperCase()), true, "hex case does not matter");
  assert.equal(razorpaySignatureMatches(RAZORPAY_SECRET, data, "nothex"), false, "non-hex input is rejected, not thrown");
  assert.equal(razorpaySignatureMatches(RAZORPAY_SECRET, data, `${good.slice(0, -1)}0`), false, "a flipped byte is rejected");
  assert.equal(razorpaySignatureMatches("wrong-secret", data, good), false, "another secret cannot forge it");
  assert.equal(razorpaySignatureMatches(RAZORPAY_SECRET, `${data}|extra`, good), false, "a different payload is rejected");
}

function checkPlanRows() {
  assert.equal(activePlanFrom({ plan: "monthly", status: "active", current_period_end: new Date(Date.now() + 86_400_000).toISOString() }), "monthly");
  assert.equal(activePlanFrom({ plan: "lifetime", status: "active", current_period_end: null }), "lifetime", "lifetime never expires");
  assert.equal(activePlanFrom({ plan: "monthly", status: "active", current_period_end: new Date(Date.now() - 86_400_000).toISOString() }), null, "an expired monthly plan drops back to free");
  assert.equal(activePlanFrom({ plan: "yearly", status: "past_due", current_period_end: null }), null, "a failed payment is not a plan");
  assert.equal(activePlanFrom({ plan: "godmode", status: "active", current_period_end: null }), null, "an unknown plan id is ignored");
}

async function checkHttpFlow() {
  const plansList = await request("/api/billing/plans");
  assert.equal(plansList.status, 200);
  assert.equal(plansList.payload.configured, true);
  assert.equal(plansList.payload.currentPlan, null, "a signed-out visitor is on the free plan");
  assert.equal(plansList.payload.trial, null, "a signed-out browser gets no trial - there is no account to tie it to");
  assert.deepEqual(plansList.payload.plans.map((plan) => plan.amount), [399, 2999, 1999]);
  assert.equal(JSON.stringify(plansList.payload).includes(RAZORPAY_SECRET), false, "the key secret never reaches the client");
  assert.equal(plansList.payload.keyId, "rzp_test_1234567890", "the publishable key id is shared");

  const signedOut = await request("/api/billing/checkout", { method: "POST", body: { plan: "monthly" } });
  assert.equal(signedOut.status, 401, "checkout requires an account");
  assert.equal(signedOut.payload.code, "AUTH_REQUIRED");

  const login = await request("/api/auth/login", { method: "POST", body: { email: "learner@orbit.test", password: "orbit-test-password" } });
  assert.equal(login.status, 200);
  const cookie = (login.headers.getSetCookie?.() || []).map((part) => part.split(";")[0]).join("; ");
  assert.ok(cookie.includes("orbit_access="), "login sets the session cookie");

  const trialStatus = await request("/api/status", { cookie });
  assert.equal(trialStatus.payload.tier, "paid", "a signed-in account with no plan gets the 30-day Pro trial");
  assert.equal(trialStatus.payload.plan, "trial");
  assert.equal(trialStatus.payload.limits.monthlySkills, null, "the trial really removes the one-skill-a-month cap");
  assert.equal(trialStatus.payload.limits.tutorCalls, 120, "and raises the daily allowance to Pro's");
  assert.equal(trialStatus.payload.trial.daysLeft, 30, "day one says 30 days left");
  assert.ok(trials.has(USER_ID), "the trial row is written on the first signed-in request");
  assert.equal(trialStatus.payload.trial.endsAt, new Date(new Date(trials.get(USER_ID).started_at).getTime() + 30 * 86_400_000).toISOString(), "30 days from the start date");

  const duringTrial = await request("/api/billing/plans", { cookie });
  assert.equal(duringTrial.payload.currentPlan, null, "a trial is not a purchase, so it must not hide the buy buttons");
  assert.equal(duringTrial.payload.needsSignIn, false, "a trial learner is already signed in");
  assert.equal(duringTrial.payload.trial.daysLeft, 30, "the plans screen can show the countdown");

  // A crafted request that tries to buy monthly for one paisa must still be billed at the server price.
  const cheap = await request("/api/billing/checkout", {
    method: "POST",
    body: { plan: "monthly", amount: 1, currency: "USD", notes: { user_id: OTHER_USER_ID } },
    cookie
  });
  assert.equal(cheap.status, 200);
  assert.equal(cheap.payload.amount, 39900, "the price comes from the server's plan table");
  assert.equal(lastOrderRequest.currency, "INR", "the currency comes from the server too");
  assert.equal(lastOrderRequest.notes.user_id, USER_ID, "the order is bound to the signed-in account");

  const badPlan = await request("/api/billing/checkout", { method: "POST", body: { plan: "godmode" }, cookie });
  assert.equal(badPlan.status, 400, "an unknown plan id is refused");

  const badSignature = await request("/api/billing/verify", {
    method: "POST",
    body: { razorpay_order_id: "order_test_1", razorpay_payment_id: "pay_test_1", razorpay_signature: signature("order_test_1|pay_test_1", "forged") },
    cookie
  });
  assert.equal(badSignature.status, 400, "a forged signature grants nothing");
  assert.equal(badSignature.payload.code, "PAYMENT_SIGNATURE_INVALID");
  assert.equal(plans.has(USER_ID), false, "no plan row is written for a bad signature");

  const verified = await request("/api/billing/verify", {
    method: "POST",
    body: { razorpay_order_id: "order_test_1", razorpay_payment_id: "pay_test_1", razorpay_signature: signature("order_test_1|pay_test_1") },
    cookie
  });
  assert.equal(verified.status, 200, `payment verify should succeed: ${JSON.stringify(verified.payload)}`);
  assert.equal(verified.payload.tier, "paid");
  assert.equal(verified.payload.plan, "monthly");
  assert.ok(new Date(verified.payload.currentPeriodEnd).getTime() > Date.now(), "monthly grants 30 days");
  assert.equal(plans.get(USER_ID).payment_id, "pay_test_1");

  const paidStatus = await request("/api/status", { cookie });
  assert.equal(paidStatus.payload.tier, "paid", "the plan flips in real time for the next request");
  assert.equal(paidStatus.payload.plan, "monthly");
  assert.equal(paidStatus.payload.trial, null, "a real plan is never reported as a trial");

  const alreadyPaid = await request("/api/billing/plans", { cookie });
  assert.equal(alreadyPaid.payload.currentPlan, "monthly");
  assert.equal(alreadyPaid.payload.plans.length, 3, "the list is still shown so the learner can see what they have");
}

async function checkWebhook() {
  const event = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_webhook_1",
          order_id: "order_hook_1",
          status: "captured",
          notes: { user_id: OTHER_USER_ID, plan: "lifetime", email: "hooked@orbit.test" }
        }
      }
    }
  };
  const raw = JSON.stringify(event);

  const unsigned = await request("/api/billing/webhook", {
    method: "POST",
    body: raw,
    headers: { "X-Razorpay-Signature": signature(raw, "wrong-secret") }
  });
  assert.equal(unsigned.status, 400, "a webhook with the wrong signature is refused");
  assert.equal(unsigned.payload.code, "BILLING_WEBHOOK_SIGNATURE_INVALID");
  assert.equal(plans.has(OTHER_USER_ID), false);

  const delivered = await request("/api/billing/webhook", {
    method: "POST",
    body: raw,
    headers: { "X-Razorpay-Signature": signature(raw, WEBHOOK_SECRET) }
  });
  assert.equal(delivered.status, 200, `webhook should be handled: ${JSON.stringify(delivered.payload)}`);
  assert.equal(plans.get(OTHER_USER_ID).plan, "lifetime");
  assert.equal(plans.get(OTHER_USER_ID).current_period_end, null, "a lifetime grant has no period end");

  const noise = await request("/api/billing/webhook", {
    method: "POST",
    body: JSON.stringify({ event: "payment_authorized", payload: { payment: { entity: { notes: {} } } } }),
    headers: { "X-Razorpay-Signature": signature(JSON.stringify({ event: "payment_authorized", payload: { payment: { entity: { notes: {} } } } }), WEBHOOK_SECRET) }
  });
  assert.equal(noise.status, 200);
  assert.equal(noise.payload.handled, false, "unrelated events are acknowledged without changing plans");
}

async function main() {
  assert.deepEqual(Object.keys(billingPlans), ["monthly", "yearly", "lifetime"]);
  assert.equal(billingPlanList()[0].amountPaise, undefined, "the client list exposes rupees, not paise internals");

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  try {
    checkPlanRows();
    await checkSignatureHelper();
    await checkHttpFlow();
    await checkWebhook();
  } finally {
    await new Promise((resolve) => server.close(resolve));
    globalThis.fetch = realFetch;
  }
  console.log("Billing checks passed: Razorpay signatures, server-side prices, plan grant, real-time tier flip and webhook.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
