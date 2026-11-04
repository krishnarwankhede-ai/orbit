"use strict";

const assert = require("node:assert/strict");

process.env.AI_PROVIDER = "gemini";
process.env.AI_MODEL = "gemini-3.5-flash";
process.env.OPENAI_MODEL = "gpt-4o-mini";
process.env.AI_API_KEY = "test-gemini-key";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.OPENROUTER_API_KEY = "test-openrouter-key";
process.env.AI_FALLBACK_PROVIDERS = "openai,anthropic,openrouter";

const {
  askModel, providerChain, roadmapSchema, tutorSchema, resolveProviderModel, limitAiUsage, chargeAiUsage, dailyLimit,
  monthlySkillLimit, skillLimitPhrase, skillMonth, skillKeyOf, skillGate, saveSkillStart, requireAccountForSkill,
  validateBrief, validateLesson, validateDoubt
} = require("../server.js");

const tutorReply = {
  reply: "Bilkul sahi!",
  assessment: "correct",
  masteryDelta: 12,
  question: "Which line stores a name?",
  activityType: "multiple_choice",
  options: ["name = 'Ravi'", "print(name)", "name == 'Ravi'"]
};

const history = [
  { role: "user", text: "age = 25" },
  { role: "assistant", text: "What does the variable name do?" },
  { role: "user", text: "It stores the number" },
  { role: "user", text: "also it can change later" }
];

const json = (value) => JSON.stringify(value);
let responses = [];
const calls = [];

globalThis.fetch = async (url, options) => {
  calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
  const next = responses.shift();
  if (!next) throw new Error(`Unexpected AI request to ${url}`);
  return {
    ok: next.status < 400,
    status: next.status,
    json: async () => next.payload
  };
};

async function run(label, provider, providerResponses, expectCallCount, tier) {
  calls.length = 0;
  responses = providerResponses;
  process.env.AI_PROVIDER = provider;
  const data = await askModel("Teach one concept at a time. Skill: Python.", history, tutorSchema, 1200, { tier });
  assert.deepEqual(data, tutorReply, `${label}: parsed reply`);
  assert.strictEqual(calls.length, expectCallCount, `${label}: provider call count`);
  return calls;
}

async function check() {
  assert.deepEqual(
    providerChain().map((entry) => `${entry.provider}:${entry.model}`),
    ["gemini:gemini-3.5-flash", "openai:gpt-4o-mini", "anthropic:claude-sonnet-4-5", "openrouter:deepseek/deepseek-v4-flash"],
    "provider chain uses each provider's own key and model"
  );

  const geminiCalls = await run("Gemini", "gemini", [
    { status: 200, payload: { candidates: [{ content: { parts: [{ text: json(tutorReply) }] } }] } }
  ], 1);
  const gemini = geminiCalls[0];
  assert.match(gemini.url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-3\.5-flash:generateContent$/);
  assert.equal(gemini.headers["x-goog-api-key"], "test-gemini-key");
  assert.equal(gemini.body.systemInstruction.parts[0].text, "Teach one concept at a time. Skill: Python.");
  assert.deepEqual(gemini.body.contents.map((content) => content.role), ["user", "model", "user", "user"]);
  assert.equal(gemini.body.contents[0].parts[0].text, "age = 25");
  assert.equal(gemini.body.generationConfig.responseMimeType, "application/json");
  assertNoArrayBounds(gemini.body.generationConfig.responseSchema, "Gemini");
  assert.equal(gemini.body.generationConfig.responseSchema.properties.assessment.enum.length, tutorSchema.properties.assessment.enum.length, "Gemini keeps enums");
  assert.equal(gemini.body.generationConfig.maxOutputTokens, 1200);

  const openaiCalls = await run("OpenAI", "openai", [
    { status: 200, payload: { choices: [{ message: { content: json(tutorReply) } }] } }
  ], 1);
  const openai = openaiCalls[0];
  assert.equal(openai.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(openai.headers.Authorization, "Bearer test-openai-key");
  assert.equal(openai.body.model, "gpt-4o-mini");
  assert.equal(openai.body.messages[0].role, "system");
  assert.deepEqual(openai.body.messages.slice(1).map((message) => message.role), ["user", "assistant", "user", "user"]);
  assert.equal(openai.body.messages[4].content, "also it can change later");
  assert.equal(openai.body.max_completion_tokens, 1200);
  assert.equal(openai.body.response_format.type, "json_schema");
  assert.equal(openai.body.response_format.json_schema.strict, true);
  assertSchemaTranslation("OpenAI", openai.body.response_format.json_schema.schema);

  const anthropicCalls = await run("Anthropic", "anthropic", [
    { status: 200, payload: { content: [{ type: "tool_use", name: "orbit_response", input: tutorReply }] } }
  ], 1);
  const anthropic = anthropicCalls[0];
  assert.equal(anthropic.url, "https://api.anthropic.com/v1/messages");
  assert.equal(anthropic.headers["x-api-key"], "test-anthropic-key");
  assert.equal(anthropic.headers["anthropic-version"], "2023-06-01");
  assert.equal(anthropic.body.model, "claude-sonnet-4-5");
  assert.equal(anthropic.body.system, "Teach one concept at a time. Skill: Python.");
  assert.deepEqual(anthropic.body.messages.map((message) => message.role), ["user", "assistant", "user"], "Anthropic alternates roles");
  assert.equal(anthropic.body.messages[2].content, "It stores the number\n\nalso it can change later");
  assert.equal(anthropic.body.max_tokens, 1200);
  assert.equal(anthropic.body.tools[0].name, "orbit_response");
  assert.deepEqual(anthropic.body.tool_choice, { type: "tool", name: "orbit_response" });
  assertSchemaTranslation("Anthropic", anthropic.body.tools[0].input_schema);

  const fallbackCalls = await run("Quota fallback", "gemini", [
    { status: 429, payload: { error: { message: "Quota exceeded for metric: generate_content_free_tier_requests" } } },
    { status: 200, payload: { choices: [{ message: { content: json(tutorReply) } }] } }
  ], 2);
  assert.match(fallbackCalls[0].url, /generativelanguage\.googleapis\.com/);
  assert.equal(fallbackCalls[1].url, "https://api.openai.com/v1/chat/completions");

  calls.length = 0;
  responses = [
    { status: 429, payload: { error: { message: "out of quota" } } },
    { status: 401, payload: { error: { message: "Incorrect API key" } } },
    { status: 401, payload: { error: { message: "invalid x-api-key" } } },
    { status: 503, payload: { error: { message: "No available providers for this model" } } }
  ];
  process.env.AI_PROVIDER = "gemini";
  await assert.rejects(
    () => askModel("Teach.", history, tutorSchema, 1200),
    (error) => error.code === "AI_TEMPORARILY_UNAVAILABLE" && /OpenRouter/.test(error.message),
    "the last provider error is reported when every provider fails"
  );
  assert.equal(calls.length, 4, "every configured provider was tried once");

  const roadmapCalls = await runRoadmap();
  assertNoArrayBounds(roadmapCalls.body.generationConfig.responseSchema, "Gemini roadmap");

  const replyResponse = { status: 200, payload: { choices: [{ message: { content: json(tutorReply) } }] } };
  const routerFree = await run("OpenRouter free tier", "openrouter", [replyResponse], 1, "free");
  assert.equal(routerFree[0].url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(routerFree[0].headers.Authorization, "Bearer test-openrouter-key");
  assert.equal(routerFree[0].headers["X-Title"], "Orbit");
  assert.equal(routerFree[0].body.model, "deepseek/deepseek-v4-flash", "free learners get the same teacher as paid, only less of it per day");
  assert.equal(routerFree[0].body.max_tokens, 1200, "OpenRouter names the output cap max_tokens");
  assert.equal(routerFree[0].body.reasoning.enabled, false, "reasoning is off so hidden tokens cannot truncate the reply JSON");
  assert.ok(!("max_completion_tokens" in routerFree[0].body));
  assert.equal(routerFree[0].body.response_format.json_schema.strict, true);
  assertSchemaTranslation("OpenRouter", routerFree[0].body.response_format.json_schema.schema);

  const routerPaid = await run("OpenRouter paid tier", "openrouter", [replyResponse], 1, "paid");
  assert.equal(routerPaid[0].body.model, "deepseek/deepseek-v4-flash", "paid learners use the better teacher at a lower price");

  process.env.OPENROUTER_PAID_MODEL = "anthropic/claude-opus-4.6";
  assert.equal(resolveProviderModel("openrouter", "paid"), "anthropic/claude-opus-4.6", "a per-tier model overrides the default");
  process.env.OPENROUTER_MODEL = "openai/gpt-4.1";
  assert.equal(resolveProviderModel("openrouter", "paid"), "anthropic/claude-opus-4.6", "tier env still beats the pinned model");
  delete process.env.OPENROUTER_PAID_MODEL;
  assert.equal(resolveProviderModel("openrouter", "paid"), "openai/gpt-4.1", "a pinned provider model beats tier defaults");
  assert.equal(resolveProviderModel("openrouter", "free"), "openai/gpt-4.1");
  delete process.env.OPENROUTER_MODEL;
  assert.equal(resolveProviderModel("openrouter", "free"), "deepseek/deepseek-v4-flash", "unpinning returns to the tier default");

  checkUsageCaps();
  await checkSkillAllowance();
  checkLessonStage();

  console.log("AI provider checks passed: gemini, openai, anthropic, openrouter tiers, quotas and free-plan caps.");
}

function checkLessonStage() {
  const sections = (count) => Array.from({ length: count }, (_, index) => ({ heading: `Idea ${index}`, body: `Teaches idea ${index}.`, example: "" }));
  const bullets = (count) => Array.from({ length: count }, (_, index) => `Idea ${index}`);
  // The brief promises the outline the lesson will then teach, so both must allow the same range.
  assert.equal(validateBrief({ reply: "Shuru karein?", syllabus: bullets(3) }).syllabus.length, 3, "a narrow topic may open with three bullets");
  assert.equal(validateBrief({ reply: "Shuru karein?", syllabus: bullets(8) }).syllabus.length, 8, "a broad topic may open with eight bullets");
  assert.throws(
    () => validateBrief({ reply: "Shuru karein?", syllabus: bullets(2) }),
    (error) => error.code === "INVALID_TUTOR_BRIEF",
    "a two-bullet outline is rejected"
  );
  assert.equal(validateLesson({ reply: "Padho", lesson: { title: "Variables", sections: sections(3), questionCount: 2 } }).lesson.questionCount, 3, "every section gets at least one question");
  assert.equal(validateLesson({ reply: "Padho", lesson: { title: "Variables", sections: sections(8), questionCount: 40 } }).lesson.questionCount, 10, "the quiz stays inside its cap");
  assert.throws(
    () => validateLesson({ reply: "Padho", lesson: { title: "Variables", sections: sections(2), questionCount: 5 } }),
    (error) => error.code === "INVALID_TUTOR_LESSON",
    "a two-section lesson is not a complete lesson"
  );
  assert.deepEqual(validateDoubt({ reply: "PATH ka matlab hai terminal." }), { phase: "doubt", reply: "PATH ka matlab hai terminal." }, "a doubt answers and changes nothing else");
  assert.throws(
    () => validateDoubt({ reply: "   " }),
    (error) => error.code === "INVALID_TUTOR_DOUBT",
    "an empty doubt answer is rejected"
  );
}

function checkUsageCaps() {
  assert.equal(dailyLimit("free", "tutor"), 15, "free learners get about two small topics a day");
  assert.equal(dailyLimit("free", "roadmap"), 2, "default free roadmap generations per day");
  assert.equal(dailyLimit("paid", "tutor"), 120, "Pro gets about thirteen topics a day");

  // The caps are the margin protection, so they must actually stop a learner, not just report a number.
  const freeKey = `device:check-free-${Date.now()}`;
  for (let call = 1; call <= 15; call += 1) {
    limitAiUsage("free", freeKey, "tutor");
    chargeAiUsage("free", freeKey, "tutor");
  }
  assert.throws(
    () => limitAiUsage("free", freeKey, "tutor"),
    (error) => error.code === "AI_BUDGET_EXCEEDED" && error.status === 429,
    "the sixteenth free lesson call is blocked before it can spend money"
  );
  const paidKey = `device:check-paid-${Date.now()}`;
  for (let call = 1; call <= 120; call += 1) {
    limitAiUsage("paid", paidKey, "tutor");
    chargeAiUsage("paid", paidKey, "tutor");
  }
  assert.throws(
    () => limitAiUsage("paid", paidKey, "tutor"),
    (error) => error.code === "AI_BUDGET_EXCEEDED",
    "a Pro learner stops at the fair-use ceiling instead of running up the bill"
  );

  const key = `device:check-${Date.now()}`;
  limitAiUsage("free", key, "roadmap");
  limitAiUsage("free", key, "roadmap");
  assert.equal(chargeAiUsage("free", key, "roadmap"), 1, "checking a budget twice does not spend it twice");
  assert.equal(chargeAiUsage("free", key, "roadmap"), 2);
  assert.throws(
    () => limitAiUsage("free", key, "roadmap"),
    (error) => error.code === "AI_BUDGET_EXCEEDED" && error.status === 429 && /free plan/i.test(error.message),
    "the third roadmap for a free learner is blocked with an upgrade message"
  );
  assert.equal(chargeAiUsage("free", key, "tutor"), 1, "lesson calls keep their own budget");
  process.env.FREE_DAILY_TUTOR_CALLS = "1";
  assert.equal(dailyLimit("free", "tutor"), 1, "limits are configurable");
  delete process.env.FREE_DAILY_TUTOR_CALLS;
}

// Free gets one new skill a month, Pro gets unlimited. The count has to survive a browser reset,
// so it lives in Supabase - and if Supabase is down it must open the gate, not lock out studying.
async function checkSkillAllowance() {
  const realFetch = globalThis.fetch;
  const rows = new Set();
  const requests = [];
  process.env.SUPABASE_URL = "https://test-project.supabase.co";
  process.env.SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, method: options.method || "GET", headers: options.headers || {}, body: options.body });
    if ((options.method || "GET") === "POST") {
      const row = JSON.parse(options.body);
      rows.add(`${row.user_id}|${row.month}|${row.skill_key}`);
      return { ok: true, status: 201, json: async () => [] };
    }
    const month = decodeURIComponent(url).match(/month=eq\.(\d{4}-\d{2})/)?.[1];
    const owned = [...rows]
      .filter((entry) => entry.split("|")[0] === "learner-1" && entry.split("|")[1] === month)
      .map((entry) => ({ skill_key: entry.split("|")[2] }));
    return { ok: true, status: 200, json: async () => owned };
  };

  assert.equal(monthlySkillLimit("free"), 1, "a free learner gets one new skill a month");
  assert.equal(monthlySkillLimit("paid"), null, "Pro has no monthly skill cap");
  assert.equal(skillLimitPhrase("free"), "1 new skill a month", "the pricing page reads the same number the gate uses");
  assert.equal(skillLimitPhrase("paid"), "unlimited new skills a month");
  assert.match(skillMonth(), /^\d{4}-\d{2}$/, "the month key is a calendar month");
  assert.equal(skillKeyOf("  Python!! "), "python", "punctuation and case do not buy a second skill");
  assert.notEqual(skillKeyOf("python for beginners"), skillKeyOf("python"), "a differently named skill is a different skill");

  const free = { tier: "free", userId: "learner-1", usageKey: "user:learner-1", planSource: "account" };
  assert.equal((await skillGate(free, "python")).allowed, true, "an untouched month leaves the free skill open");
  await saveSkillStart("learner-1", "python");
  assert.equal((await skillGate(free, "python")).allowed, true, "rebuilding the path of a skill already started spends nothing");
  const refused = await skillGate(free, "excel");
  assert.equal(refused.allowed, false, "a second new skill in the same month is refused");
  assert.equal(refused.error.code, "SKILL_LIMIT_REACHED");
  assert.equal(refused.error.status, 429);
  assert.match(refused.error.message, /free plan/i, "the refusal names the plan so the upgrade reads as the way out");
  assert.equal((await skillGate({ tier: "paid", userId: "learner-2", planSource: "account" }, "excel")).allowed, true, "Pro starts as many skills as they like");

  const write = requests.find((entry) => entry.method === "POST");
  assert.equal(write.headers.Authorization, "Bearer test-service-key", "the count is written with the service key, so a learner's own token cannot rewrite it");
  assert.match(write.url, /on_conflict=user_id,month,skill_key/, "studying the same skill twice a month stays one row");

  globalThis.fetch = async () => { throw Object.assign(new Error("Supabase is down"), { name: "TimeoutError" }); };
  assert.equal((await skillGate(free, "excel")).allowed, true, "an outage opens the gate instead of locking out studying");
  assert.throws(
    () => requireAccountForSkill({ tier: "free", planSource: "device" }),
    (error) => error.code === "ACCOUNT_REQUIRED" && error.status === 401,
    "a signed-out browser cannot start a skill, so clearing storage cannot farm free ones"
  );
  requireAccountForSkill(free);

  globalThis.fetch = realFetch;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function runRoadmap() {
  calls.length = 0;
  process.env.AI_PROVIDER = "gemini";
  responses = [{ status: 200, payload: { candidates: [{ content: { parts: [{ text: json({ phases: [] }) }] } }] } }];
  await askModel("Build a curriculum.", [{ role: "user", text: "Build my curriculum." }], roadmapSchema, 10000);
  assert.equal(calls[0].body.generationConfig.maxOutputTokens, 10000);
  return calls[0];
}

function assertNoArrayBounds(node, label, path = "schema") {
  if (Array.isArray(node)) {
    node.forEach((entry, index) => assertNoArrayBounds(entry, label, `${path}[${index}]`));
    return;
  }
  if (!node || typeof node !== "object") return;
  assert.ok(!("minItems" in node), `${label}: minItems dropped at ${path} — Gemini rejects it`);
  assert.ok(!("maxItems" in node), `${label}: maxItems dropped at ${path} — Gemini rejects it`);
  for (const [key, value] of Object.entries(node)) assertNoArrayBounds(value, label, `${path}.${key}`);
}

function assertSchemaTranslation(label, schema) {
  assert.equal(schema.type, "object", `${label}: lowercase types`);
  assert.equal(schema.additionalProperties, false, `${label}: closed objects`);
  assert.deepEqual(schema.required.sort(), Object.keys(tutorSchema.properties).sort(), `${label}: required covers every property`);
  assert.equal(schema.properties.options.type, "array");
  assert.equal(schema.properties.options.items.type, "string");
  assert.ok(!("minItems" in schema.properties.options), `${label}: minItems dropped`);
  assert.ok(!("maxItems" in schema.properties.options), `${label}: maxItems dropped`);
  assert.ok(Array.isArray(schema.properties.assessment.enum), `${label}: enums kept`);
  assert.equal(schema.properties.masteryDelta.type, "integer", `${label}: INTEGER lowered`);
}

check().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
