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
  askModel, providerChain, roadmapSchema, tutorSchema, resolveProviderModel, limitAiUsage, chargeAiUsage, dailyLimit
} = require("../server.js");

const tutorReply = {
  reply: "Bilkul sahi!",
  assessment: "correct",
  masteryDelta: 12,
  mastered: false,
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
    ["gemini:gemini-3.5-flash", "openai:gpt-4o-mini", "anthropic:claude-sonnet-4-5", "openrouter:openai/gpt-4.1-mini"],
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
  assert.deepEqual(gemini.body.generationConfig.responseSchema, tutorSchema, "Gemini keeps the Gemini-shaped schema");
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
  assert.deepEqual(roadmapCalls.body.generationConfig.responseSchema, roadmapSchema);

  const replyResponse = { status: 200, payload: { choices: [{ message: { content: json(tutorReply) } }] } };
  const routerFree = await run("OpenRouter free tier", "openrouter", [replyResponse], 1, "free");
  assert.equal(routerFree[0].url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(routerFree[0].headers.Authorization, "Bearer test-openrouter-key");
  assert.equal(routerFree[0].headers["X-Title"], "Orbit");
  assert.equal(routerFree[0].body.model, "openai/gpt-4.1-mini", "free learners use the cheap model");
  assert.equal(routerFree[0].body.max_tokens, 1200, "OpenRouter names the output cap max_tokens");
  assert.ok(!("max_completion_tokens" in routerFree[0].body));
  assert.equal(routerFree[0].body.response_format.json_schema.strict, true);
  assertSchemaTranslation("OpenRouter", routerFree[0].body.response_format.json_schema.schema);

  const routerPaid = await run("OpenRouter paid tier", "openrouter", [replyResponse], 1, "paid");
  assert.equal(routerPaid[0].body.model, "anthropic/claude-sonnet-4.5", "paid learners use Claude");

  process.env.OPENROUTER_PAID_MODEL = "anthropic/claude-opus-4.6";
  assert.equal(resolveProviderModel("openrouter", "paid"), "anthropic/claude-opus-4.6", "a per-tier model overrides the default");
  process.env.OPENROUTER_MODEL = "openai/gpt-4.1";
  assert.equal(resolveProviderModel("openrouter", "paid"), "anthropic/claude-opus-4.6", "tier env still beats the pinned model");
  delete process.env.OPENROUTER_PAID_MODEL;
  assert.equal(resolveProviderModel("openrouter", "paid"), "openai/gpt-4.1", "a pinned provider model beats tier defaults");
  assert.equal(resolveProviderModel("openrouter", "free"), "openai/gpt-4.1");
  delete process.env.OPENROUTER_MODEL;
  assert.equal(resolveProviderModel("openrouter", "free"), "openai/gpt-4.1-mini", "unpinning returns to the tier default");

  checkUsageCaps();

  console.log("AI provider checks passed: gemini, openai, anthropic, openrouter tiers, quotas and free-plan caps.");
}

function checkUsageCaps() {
  assert.equal(dailyLimit("free", "tutor"), 40, "default free lesson requests per day");
  assert.equal(dailyLimit("free", "roadmap"), 2, "default free roadmap generations per day");
  assert.equal(dailyLimit("paid", "tutor"), 600, "paid learners get a much larger budget");
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

async function runRoadmap() {
  calls.length = 0;
  process.env.AI_PROVIDER = "gemini";
  responses = [{ status: 200, payload: { candidates: [{ content: { parts: [{ text: json({ phases: [] }) }] } }] } }];
  await askModel("Build a curriculum.", [{ role: "user", text: "Build my curriculum." }], roadmapSchema, 10000);
  assert.equal(calls[0].body.generationConfig.maxOutputTokens, 10000);
  return calls[0];
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
  assert.equal(schema.properties.mastered.type, "boolean", `${label}: BOOLEAN lowered`);
}

check().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
