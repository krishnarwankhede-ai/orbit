const CONCEPTS = [
  "Variables", "Data types", "Numbers & math", "Strings", "Booleans",
  "Comparisons", "If statements", "Lists", "For loops", "While loops",
  "Functions", "Parameters", "Return values", "Dictionaries", "Tuples",
  "Sets", "Errors & debugging", "Files", "Modules", "Your first project"
];

const STORAGE_KEY = "orbit-python-progress-v1";
const API_BASE_URL_KEY = "orbit-api-base-url-v1";
const DEVICE_ID_KEY = "orbit-device-id-v1";
const DEFAULT_PROGRESS = {
  mastery: 0,
  attempts: 0,
  correctAnswers: 0,
  minutes: 0,
  streak: 0,
  xp: 0,
  lastStudyDate: "",
  masteredConcepts: [],
  masteryByConcept: {},
  currentConcept: 0,
  phase: "reflection",
  conceptStats: {},
  session: null
};

let lessonStartedAt = Date.now();
const phases = [
  { title: "Python foundations", subtitle: "Get comfortable with the building blocks.", start: 0, end: 6 },
  { title: "Build your confidence", subtitle: "Combine concepts and solve little challenges.", start: 6, end: 13 },
  { title: "Make something real", subtitle: "Bring what you know together in a project.", start: 13, end: 20 }
];

const COURSES = {
  python: {
    name: "Python", icon: "Py", description: "Learn to code, automate tasks, and bring your ideas to life.",
    goals: ["Build websites & apps", "Explore data & AI", "Automate everyday tasks", "Learn coding fundamentals"],
    concepts: CONCEPTS,
    phases,
    quiz: {
      question: "Which line gives a value the name `score`?",
      options: ["score = 10", "10 = score", "score == 10", "Not sure yet"],
      answer: 0
    },
    lesson: true
  },
  web: {
    name: "Web development", icon: "</>", description: "Understand how websites are designed, built, and brought online.",
    goals: ["Make my first website", "Build interactive web apps", "Create a portfolio", "Understand how the web works"],
    concepts: ["How websites work", "HTML building blocks", "Headings & text", "Links & images", "CSS essentials", "Colors & spacing", "Page layouts", "Responsive design", "JavaScript basics", "Buttons & events", "Connect a simple app", "Publish your website"],
    phases: [
      { title: "Your first web page", subtitle: "Discover the pieces behind a website.", start: 0, end: 4 },
      { title: "Make it your own", subtitle: "Add style, structure, and interactivity.", start: 4, end: 8 },
      { title: "Build & share", subtitle: "Bring the pieces together and go live.", start: 8, end: 12 }
    ],
    quiz: { question: "What does HTML mainly describe?", options: ["The structure of a webpage", "The color of a keyboard", "A type of internet connection", "Not sure yet"], answer: 0 },
    lesson: true
  },
  design: {
    name: "UI/UX design", icon: "✳", description: "Create thoughtful, easy-to-use digital experiences.",
    goals: ["Design an app", "Build a design portfolio", "Make websites easier to use", "Learn the design basics"],
    concepts: ["What makes a good experience", "Understand your audience", "Sketch your first idea", "Visual hierarchy", "Color with intention", "Typography basics", "Spacing & layout", "Design reusable components", "Prototype a flow", "Test with real people", "Improve with feedback", "Present your design"],
    phases: [
      { title: "Think like a designer", subtitle: "Start with people and the problems they have.", start: 0, end: 4 },
      { title: "Shape your ideas", subtitle: "Practice the visual building blocks of design.", start: 4, end: 8 },
      { title: "Design for real people", subtitle: "Prototype, test, and improve your work.", start: 8, end: 12 }
    ],
    quiz: { question: "In design, visual hierarchy helps people...", options: ["Notice what matters first", "Make a screen heavier", "Choose a faster internet plan", "Not sure yet"], answer: 0 },
    lesson: true
  },
  business: {
    name: "Business", icon: "↗", description: "Turn an early idea into a plan people actually need.",
    goals: ["Explore a business idea", "Start a small business", "Understand marketing", "Learn how businesses work"],
    concepts: ["Find a problem worth solving", "Understand your customer", "Test your assumptions", "Shape your offer", "Choose a business model", "Tell your story", "Reach your first customers", "Set a simple budget", "Track what matters", "Learn from feedback", "Plan your next step", "Pitch your idea"],
    phases: [
      { title: "Start with a real need", subtitle: "Learn about problems, people, and possibilities.", start: 0, end: 4 },
      { title: "Shape your idea", subtitle: "Make an offer and test it thoughtfully.", start: 4, end: 8 },
      { title: "Make it happen", subtitle: "Plan the first real steps for your idea.", start: 8, end: 12 }
    ],
    quiz: { question: "Before building a product, it helps to first...", options: ["Understand who has the problem", "Pick a company logo", "Buy a bigger office", "Not sure yet"], answer: 0 },
    lesson: true
  },
  english: {
    name: "English", icon: "Aa", description: "Build confidence in everyday English, one conversation at a time.",
    goals: ["Speak more confidently", "Use English at work", "Travel with confidence", "Grow my everyday vocabulary"],
    concepts: ["Say hello & introduce yourself", "Everyday questions", "Useful daily words", "Build a simple sentence", "Talk about your day", "Ask for directions", "Order food politely", "Talk about the past", "Share your plans", "Understand a conversation", "Speak up at work", "Keep a conversation going"],
    phases: [
      { title: "Everyday conversations", subtitle: "Find your words for familiar moments.", start: 0, end: 4 },
      { title: "Speak with confidence", subtitle: "Build useful sentences for real life.", start: 4, end: 8 },
      { title: "English out in the world", subtitle: "Practice for your own goals and conversations.", start: 8, end: 12 }
    ],
    quiz: { question: "Choose the best word: “She ___ learning English.”", options: ["is", "are", "be", "Not sure yet"], answer: 0 },
    lesson: true
  },
  custom: {
    name: "Your skill", icon: "✧", description: "Build a learning path around any skill you want to explore.",
    goals: ["Learn for curiosity", "Use it at work or school", "Make something of my own", "Prepare for a new opportunity"],
    concepts: ["Start with the essentials", "Understand the key building blocks", "Practice with a small challenge"],
    phases: [
      { title: "Get your bearings", subtitle: "Build a clear foundation.", start: 0, end: 1 },
      { title: "Practice with purpose", subtitle: "Turn the basics into useful skills.", start: 1, end: 2 },
      { title: "Make it your own", subtitle: "Use your new skill for something real.", start: 2, end: 3 }
    ],
    quiz: { question: "What have you tried so far? Choose the closest match.", options: ["Nothing yet — I’m starting fresh", "I’ve tried a little and know some basics", "I use this skill and want to level up", "Not sure yet"], answer: 0 },
    lesson: true
  }
};

const PROFILE_KEY = "orbit-learner-profile-v1";
let profile = loadProfile();
let progress = loadProgress();
let toastTimer;
let lessonHistory = [];
let tutorThinkingNode = null;
let generatedRoadmap = profile?.curriculum || null;
let roadmapRequestId = 0;
let roadmapError = "";
let apiReady = false;
let accountConfigured = false;
let learnerTier = "";
let learnerPlanId = "";
let skillsLeft = null;
let skillGateWait = "";
let accountUser = null;
let cloudSyncReady = false;
let cloudSaveTimer;
let cloudSaveQueue = Promise.resolve();
let accountMode = "signup";
let onboardingStep = 0;
let onboardingState = {
  name: profile?.name || "",
  skill: profile?.skill || "",
  customSkill: profile?.customSkill || "",
  level: profile?.level || "",
  quizAnswer: profile?.quizAnswer ?? -1,
  placementNotes: profile?.placementNotes || "",
  goal: profile?.goal || "",
  customGoal: profile?.customGoal || "",
  minutes: profile?.minutes || 10
};

const elements = {
  pageLabel: document.querySelector("#page-label"),
  dashboard: document.querySelector("#dashboard-view"),
  lesson: document.querySelector("#lesson-view"),
  roadmap: document.querySelector("#roadmap-view"),
  chat: document.querySelector("#chat-messages"),
  answer: document.querySelector("#answer-input"),
  send: document.querySelector("#send-answer"),
  toast: document.querySelector("#toast"),
  onboarding: document.querySelector("#onboarding-screen"),
  onboardingContent: document.querySelector("#onboarding-content"),
  onboardingActions: document.querySelector("#onboarding-actions")
};

function loadProfile() {
  const saved = localStorage.getItem(PROFILE_KEY);
  if (!saved) return null;
  const parsed = JSON.parse(saved);
  if (!parsed || typeof parsed !== "object" || !COURSES[parsed.skill]) {
    throw new Error("Saved learning plan is invalid. Clear this site's browser data to start fresh.");
  }
  return parsed;
}

function getCourse(plan = profile) {
  const course = COURSES[plan?.skill] || COURSES.python;
  if (plan?.skill !== "custom") return course;
  return { ...course, name: plan.customSkill || course.name, icon: "✧" };
}

function getConcepts(plan = profile) {
  if (Array.isArray(plan?.curriculum?.phases)) {
    return plan.curriculum.phases.flatMap((phase) => phase.concepts.map((concept) => concept.title));
  }
  return getCourse(plan).concepts;
}

function hasComprehensiveCurriculum(plan) {
  const phases = plan?.curriculum?.phases;
  return Array.isArray(phases)
    && phases.length >= 8
    && phases.reduce((total, phase) => total + (Array.isArray(phase.concepts) ? phase.concepts.length : 0), 0) >= 40;
}

function carryProgressToCurriculum(previousPlan, previousProgress, nextPlan) {
  const sameSkill = previousPlan?.skill === nextPlan.skill
    && previousPlan?.customSkill === nextPlan.customSkill;
  if (!sameSkill || !Array.isArray(previousPlan?.curriculum?.phases)) {
    return { ...DEFAULT_PROGRESS, masteredConcepts: [], masteryByConcept: {}, conceptStats: {} };
  }

  const oldConcepts = previousPlan.curriculum.phases.flatMap((phase) => phase.concepts);
  const newConcepts = nextPlan.curriculum.phases.flatMap((phase) => phase.concepts);
  const newIndexByTitle = new Map(newConcepts.map((concept, index) => [concept.title.trim().toLowerCase(), index]));
  const newIndexByOldIndex = new Map();
  oldConcepts.forEach((concept, oldIndex) => {
    const newIndex = newIndexByTitle.get(concept.title.trim().toLowerCase());
    if (newIndex !== undefined) newIndexByOldIndex.set(oldIndex, newIndex);
  });
  const masteredConcepts = previousProgress.masteredConcepts
    .map((index) => newIndexByOldIndex.get(index))
    .filter((index) => index !== undefined);
  const mappedCurrent = newIndexByOldIndex.get(previousProgress.currentConcept);
  let currentConcept = mappedCurrent !== undefined && !masteredConcepts.includes(mappedCurrent)
    ? mappedCurrent
    : newConcepts.findIndex((_, index) => index > (mappedCurrent ?? -1) && !masteredConcepts.includes(index));
  if (currentConcept < 0) currentConcept = newConcepts.findIndex((_, index) => !masteredConcepts.includes(index));
  const masteryByConcept = {};
  const conceptStats = {};
  newIndexByOldIndex.forEach((newIndex, oldIndex) => {
    if (previousProgress.masteryByConcept?.[oldIndex] !== undefined) {
      masteryByConcept[newIndex] = previousProgress.masteryByConcept[oldIndex];
    }
    if (previousProgress.conceptStats?.[oldIndex]) {
      conceptStats[newIndex] = previousProgress.conceptStats[oldIndex];
    }
  });
  const activeMastery = Number(masteryByConcept[currentConcept]) || 0;
  return {
    ...previousProgress,
    masteredConcepts,
    masteryByConcept,
    conceptStats,
    currentConcept: Math.max(0, currentConcept),
    mastery: activeMastery,
    session: null,
    phase: masteredConcepts.includes(currentConcept) ? "complete" : "reflection"
  };
}

function getPhases(plan = profile) {
  if (Array.isArray(plan?.curriculum?.phases)) {
    let start = 0;
    return plan.curriculum.phases.map((phase) => {
      const current = { ...phase, start, end: start + phase.concepts.length };
      start = current.end;
      return current;
    });
  }
  const course = getCourse(plan);
  const coursePhases = course.phases.map((phase) => ({ ...phase }));
  if (plan?.level?.startsWith("Intermediate")) {
    coursePhases[0].title = "Quick refresh";
    coursePhases[0].subtitle = "Build on what you already know.";
    coursePhases[1].title = `Level up your ${course.name}`;
  } else if (plan?.level?.startsWith("Advanced")) {
    coursePhases[0].title = "Fill the gaps";
    coursePhases[0].subtitle = "Check your foundations and sharpen the details.";
    coursePhases[1].title = `Advanced ${course.name}`;
  }
  const finalPhase = coursePhases[coursePhases.length - 1];
  if (plan?.customGoal?.trim()) finalPhase.subtitle = `Your project: ${plan.customGoal.trim()}`;
  else if (plan?.goal) finalPhase.subtitle = `A path towards: ${plan.goal.toLowerCase()}.`;
  return coursePhases;
}

function loadProgress() {
  const key = progressStorageKey();
  const saved = localStorage.getItem(key) || (profile?.skill === "python" ? localStorage.getItem(STORAGE_KEY) : null);
  if (!saved) return { ...DEFAULT_PROGRESS, masteredConcepts: [] };
  const parsed = JSON.parse(saved);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.masteredConcepts)) {
    throw new Error("Saved learning progress is invalid. Clear this site's browser data to start fresh.");
  }
  return normalizeProgress(parsed);
}

function normalizeProgress(saved) {
  const conceptStats = {};
  if (saved.conceptStats && typeof saved.conceptStats === "object" && !Array.isArray(saved.conceptStats)) {
    Object.entries(saved.conceptStats).forEach(([index, stats]) => {
      if (!/^\d+$/.test(index) || !stats || typeof stats !== "object") return;
      const attempts = Number.isInteger(stats.attempts) ? Math.max(0, stats.attempts) : 0;
      const correct = Number.isInteger(stats.correct) ? Math.max(0, Math.min(attempts, stats.correct)) : 0;
      conceptStats[index] = { attempts, correct };
    });
  }
  const validPhases = ["reflection", "exercise", "complete"];
  return {
    ...DEFAULT_PROGRESS,
    ...saved,
    masteredConcepts: [...new Set(saved.masteredConcepts.filter(Number.isInteger))],
    conceptStats,
    phase: validPhases.includes(saved.phase) ? saved.phase : "reflection"
  };
}

function progressStorageKey(plan = profile) {
  const identifier = plan?.skill === "custom"
    ? encodeURIComponent(String(plan.customSkill || "custom").toLowerCase().trim())
    : plan?.skill;
  return plan ? `orbit-progress-${identifier}-v1` : STORAGE_KEY;
}

function saveProgress() {
  localStorage.setItem(progressStorageKey(), JSON.stringify(progress));
  queueCloudSave();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3200);
}

function learnerDeviceId() {
  let stored = "";
  try {
    stored = localStorage.getItem(DEVICE_ID_KEY) || "";
    if (!stored) {
      stored = window.crypto?.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_ID_KEY, stored);
    }
  } catch {
    stored = stored || "unknown-device";
  }
  return stored;
}

async function apiRequest(endpoint, payload, method) {
  if (window.location.protocol === "file:") {
    throw new Error("Open Orbit from http://127.0.0.1:3000 and keep the local server running to use cloud AI.");
  }
  const configuredBaseUrl = localStorage.getItem(API_BASE_URL_KEY)?.trim() || "";
  const nativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
  if (nativeApp && !configuredBaseUrl) {
    throw new Error("This APK is an offline shell. Tap the settings button and enter your HTTPS Orbit backend URL to use AI.");
  }
  const requestUrl = configuredBaseUrl ? new URL(endpoint, `${configuredBaseUrl}/`).toString() : endpoint;
  const crossOrigin = Boolean(configuredBaseUrl && new URL(configuredBaseUrl).origin !== window.location.origin);
  let response;
  try {
    response = await fetch(requestUrl, {
      method: method || (payload ? "POST" : "GET"),
      headers: payload ? { "Content-Type": "application/json" } : {},
      body: payload ? JSON.stringify(payload) : undefined,
      credentials: crossOrigin ? "include" : "same-origin",
      signal: AbortSignal.timeout(35_000)
    });
  } catch (error) {
    if (error.name === "TimeoutError") throw new Error("The request took too long. Please try again.");
    throw new Error("Could not reach the Orbit server. Check its URL and internet connection.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error(data?.error || `AI request failed (${response.status}).`), { code: data?.code || "", status: response.status });
  }
  return data;
}

// In the APK the policy pages live on the connected backend, not inside the shell.
function pointLegalLinksAtBackend() {
  const configuredBaseUrl = localStorage.getItem(API_BASE_URL_KEY)?.trim() || "";
  if (window.Capacitor?.isNativePlatform?.() && !configuredBaseUrl) {
    document.querySelectorAll(".site-legal-links").forEach((nav) => { nav.hidden = true; });
    return;
  }
  if (!configuredBaseUrl) return;
  document.querySelectorAll(".site-legal-links a, .legal-inline-link").forEach((link) => {
    const relative = link.getAttribute("href");
    if (!relative?.startsWith("/")) return;
    link.href = new URL(relative, `${configuredBaseUrl}/`).toString();
    link.target = "_blank";
    link.rel = "noopener";
  });
}

async function updateAIStatus() {
  const nativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
  const configuredBaseUrl = localStorage.getItem(API_BASE_URL_KEY)?.trim() || "";
  if (nativeApp && !configuredBaseUrl) {
    apiReady = false;
    accountConfigured = false;
    learnerTier = "";
    learnerPlanId = "";
    skillsLeft = null;
    const pill = document.querySelector("#ai-status-pill");
    pill.classList.add("is-disconnected");
    document.querySelector("#ai-status-text").textContent = "Connect server";
    pill.title = "Tap the settings button to connect your HTTPS Orbit backend.";
    renderAccountPanel();
    return;
  }
  try {
    const status = await apiRequest("/api/status");
    apiReady = status.ready;
    accountConfigured = status.accountConfigured;
    const pill = document.querySelector("#ai-status-pill");
    pill.classList.toggle("is-connected", status.ready);
    pill.classList.toggle("is-disconnected", !status.ready);
    document.querySelector("#ai-status-text").textContent = status.ready
      ? `${status.provider} AI ready`
      : "AI key needed";
    if (!status.ready) pill.title = status.error || "Add an OpenRouter, Gemini, OpenAI, or Anthropic API key to the server's .env file. See README.md.";
    else pill.title = `${status.tier === "paid" ? "Paid" : "Free"} plan · ${status.model} · ${(status.providers || []).map((entry) => `${entry.provider} ${entry.model}`).join(", ")}.`;
    learnerTier = status.tier === "paid" ? "Paid plan" : "Free plan";
    learnerPlanId = ["monthly", "yearly", "lifetime"].includes(status.plan) ? status.plan : "";
    const cap = status.limits?.monthlySkills;
    skillsLeft = typeof cap === "number" && typeof status.skillsUsed === "number"
      ? Math.max(0, cap - status.skillsUsed)
      : null;
    // Someone parked at the skill gate should not have to hunt for the button again: once the
    // account exists or the plan activates, the path request they already filled in can re-run.
    if (skillGateWait === "account" && accountUser) resumeSkillStart();
    else if (skillGateWait === "plan" && learnerPlanId) resumeSkillStart();
    renderAccountPanel();
  } catch {
    apiReady = false;
    accountConfigured = false;
    learnerTier = "";
    learnerPlanId = "";
    skillsLeft = null;
    const pill = document.querySelector("#ai-status-pill");
    pill.classList.add("is-disconnected");
    document.querySelector("#ai-status-text").textContent = "Server not running";
    pill.title = "Start Orbit with npm start to connect cloud AI.";
    renderAccountPanel();
  }
}

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let razorpayScriptPromise = null;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_CHECKOUT_URL;
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error("Could not load the Razorpay payment window. Check your connection and try again."));
      };
      document.head.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

function rupees(amount) {
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

function planNote(planId) {
  return { monthly: "Pro monthly", yearly: "Pro yearly", lifetime: "Pro lifetime" }[planId] || "Free plan";
}

async function confirmRazorpayPayment(response) {
  const message = document.querySelector("#plans-message");
  message.textContent = "Confirming your payment with Razorpay…";
  try {
    const result = await apiRequest("/api/billing/verify", {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    });
    await updateAIStatus();
    document.querySelector("#plans-dialog").close();
    showToast(result.plan === "lifetime"
      ? "Pro lifetime is unlocked. Your tutor is now available all day."
      : `Pro is active until ${new Date(result.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`);
  } catch (error) {
    message.textContent = `${error.message} Payment id ${response.razorpay_payment_id} — quote it if you need help.`;
  }
}

async function startPayment(planId, button) {
  const message = document.querySelector("#plans-message");
  button.disabled = true;
  message.textContent = "Opening a secure Razorpay window…";
  try {
    const order = await apiRequest("/api/billing/checkout", { plan: planId });
    const Razorpay = await loadRazorpayCheckout();
    const checkout = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Orbit",
      description: `${order.planLabel} — AI learning plan`,
      prefill: { name: order.payerName, email: order.payerEmail },
      notes: { plan: order.plan },
      theme: { color: "#5b5bd6" },
      handler: confirmRazorpayPayment
    });
    checkout.on("payment.failed", (event) => {
      message.textContent = `Payment failed (${event?.error?.description || "the bank declined it"}). No plan was granted — try another method.`;
      button.disabled = false;
    });
    message.textContent = "";
    checkout.open();
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
  }
}

async function renderPlans(note) {
  const list = document.querySelector("#plan-list");
  const message = document.querySelector("#plans-message");
  const current = document.querySelector("#plan-current");
  message.textContent = note || "";
  list.textContent = "";
  let data;
  try {
    data = await apiRequest("/api/billing/plans");
  } catch (error) {
    message.textContent = error.message;
    return;
  }
  current.textContent = data.currentPlan ? `You are on ${planNote(data.currentPlan)}.` : "You are on the free plan.";
  if (!data.configured) {
    const waiting = document.createElement("p");
    waiting.className = "backend-help";
    waiting.textContent = "Payments are not switched on for this server yet. The owner needs to add Razorpay keys to its .env file.";
    list.appendChild(waiting);
    return;
  }
  if (data.currentPlan) return;
  if (data.needsSignIn) {
    const signIn = document.createElement("p");
    signIn.className = "backend-help";
    signIn.textContent = "Create an account first — a plan is tied to your signed-in email so it works on any device.";
    list.appendChild(signIn);
    return;
  }
  data.plans.forEach((plan) => {
    const card = document.createElement("article");
    card.className = "plan-card";
    const copy = document.createElement("div");
    copy.className = "plan-copy";
    const title = document.createElement("h3");
    title.textContent = plan.label;
    const blurb = document.createElement("p");
    blurb.textContent = plan.blurb;
    copy.append(title, blurb);
    const price = document.createElement("p");
    price.className = "plan-price";
    price.innerHTML = `<strong>${rupees(plan.amount)}</strong><small>${plan.periodDays ? ` / ${plan.periodDays} days` : " once"}</small>`;
    const buy = document.createElement("button");
    buy.type = "button";
    buy.className = "button button-primary plan-buy";
    buy.textContent = `Pay ${rupees(plan.amount)}`;
    buy.addEventListener("click", () => startPayment(plan.id, buy));
    card.append(copy, price, buy);
    list.appendChild(card);
  });
}

function openPlansDialog(note) {
  document.querySelector("#plans-dialog").showModal();
  renderPlans(note);
}

// Pro has no monthly skill count, so the server sends null and the note disappears by itself.
function skillNote() {
  if (skillsLeft === null) return "";
  return skillsLeft > 0
    ? ` · ${skillsLeft} new skill${skillsLeft === 1 ? "" : "s"} left this month`
    : " · this month's free skill is started - Pro adds unlimited skills";
}

function renderAccountPanel() {
  const signedIn = Boolean(accountUser);
  document.querySelector("#account-signed-in").hidden = !signedIn;
  document.querySelector("#account-signed-out").hidden = signedIn;
  document.querySelector("#account-email-label").textContent = accountUser?.email || "";
  document.querySelector("#account-title").textContent = signedIn ? "Your learning is syncing" : "Sync your learning";
  document.querySelector("#account-description").textContent = signedIn
    ? "Your roadmap and progress are connected to your account."
    : "Create an account to back up your roadmap and progress to the cloud.";
  const profileName = accountUser?.email || profile?.name || "Your learning space";
  document.querySelector(".profile-copy strong").textContent = profileName;
  const syncLabel = signedIn ? "Cloud sync on" : "Local learning";
  document.querySelector(".profile-copy small").textContent = learnerTier ? `${learnerTier} · ${syncLabel}` : syncLabel;
  const planState = document.querySelector("#account-plan-state");
  if (planState) {
    planState.textContent = `${learnerPlanId ? `Active plan: ${planNote(learnerPlanId)}` : "Active plan: Free"}${skillNote()}`;
  }
  const upgradeButton = document.querySelector("#account-upgrade");
  if (upgradeButton) upgradeButton.hidden = Boolean(learnerPlanId);
  document.querySelector("#storage-note").textContent = signedIn
    ? "Your learning progress syncs securely to your account."
    : "Your learning progress stays in this browser on this device.";
  const avatarText = (accountUser?.email || profile?.name || "Y").trim().charAt(0).toUpperCase();
  document.querySelector(".profile-button .avatar").textContent = avatarText || "Y";
  document.querySelector(".top-avatar").textContent = avatarText || "Y";
}

function setAccountMode(mode) {
  accountMode = mode;
  document.querySelectorAll("[data-account-mode]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.accountMode === mode);
  });
  document.querySelector("#account-title").textContent = mode === "signup" ? "Sync your learning" : "Welcome back";
  document.querySelector("#account-description").textContent = mode === "signup"
    ? "Create an account to back up your roadmap and progress to the cloud."
    : "Sign in to continue learning where you left off.";
  document.querySelector("#account-submit").textContent = mode === "signup" ? "Create account" : "Sign in";
  document.querySelector("#account-password").autocomplete = mode === "signup" ? "new-password" : "current-password";
  document.querySelector("#account-password").minLength = mode === "signup" ? 8 : 1;
  document.querySelector("#account-message").textContent = "";
}

function openAccountDialog() {
  if (!accountConfigured) {
    showToast("Cloud accounts need Supabase setup first. See the account setup steps in README.md.");
    return;
  }
  document.querySelector("#account-message").textContent = "";
  renderAccountPanel();
  document.querySelector("#account-dialog").showModal();
}

function applyCloudState(state) {
  if (!state?.profile || !state?.progress
    || !COURSES[state.profile.skill]
    || !Array.isArray(state.progress.masteredConcepts)) {
    throw new Error("Your cloud learning data is incomplete. Your local copy has been kept unchanged.");
  }
  profile = state.profile;
  progress = normalizeProgress(state.progress);
  generatedRoadmap = profile.curriculum || null;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(progressStorageKey(profile), JSON.stringify(progress));
  renderCourseDetails();
  renderProgress();
  renderRoadmap();
  if (elements.onboarding && !elements.onboarding.hidden) {
    elements.onboarding.hidden = true;
    document.querySelector(".app-shell").hidden = false;
  }
}

async function syncAccountState() {
  const result = await apiRequest("/api/account");
  accountUser = result.user;
  if (accountUser && result.state) {
    applyCloudState(result.state);
  }
  cloudSyncReady = Boolean(accountUser);
  renderAccountPanel();
  if (accountUser && !result.state && profile) queueCloudSave();
}

const OAUTH_VERIFIER_KEY = "orbit-google-oauth-verifier";

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(text) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return toBase64Url(digest);
}

async function startGoogleSignIn() {
  const button = document.querySelector("#account-google");
  const message = document.querySelector("#account-message");
  if (!window.crypto?.subtle || !window.crypto?.getRandomValues) {
    message.textContent = "This browser cannot start a Google sign-in. Please use email and password.";
    return;
  }
  button.disabled = true;
  message.textContent = "Opening Google sign-in…";
  try {
    const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(48)));
    sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier);
    const challenge = await sha256Base64Url(verifier);
    const result = await apiRequest(`/api/auth/oauth/start?provider=google&code_challenge=${encodeURIComponent(challenge)}`);
    window.location.assign(result.authorizeUrl);
  } catch (error) {
    message.textContent = error.message;
    button.disabled = false;
  }
}

async function finishPendingGoogleSignIn() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const providerError = params.get("error_description") || params.get("error");
  if (!code && !providerError) return;
  history.replaceState({}, "", window.location.pathname);
  const verifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY) || "";
  sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
  const message = document.querySelector("#account-message");
  if (providerError) {
    if (message) message.textContent = `Google did not allow the sign-in: ${providerError}`;
    return;
  }
  if (!verifier) {
    showToast("That Google sign-in link is no longer valid. Open the account window and try again.");
    return;
  }
  try {
    const result = await apiRequest("/api/auth/oauth/complete", { code, codeVerifier: verifier });
    accountUser = result.user;
    cloudSyncReady = true;
    await updateAIStatus();
    renderAccountPanel();
    if (profile) queueCloudSave();
    showToast(`Signed in with Google as ${result.user.email}.`);
  } catch (error) {
    if (message) message.textContent = error.message;
    showToast(error.message);
  }
}

async function initializeAccount() {
  await finishPendingGoogleSignIn();
  if (!accountConfigured) return;
  try {
    await syncAccountState();
  } catch (error) {
    showToast(`Account sync could not start: ${error.message}`);
  }
}

function queueCloudSave() {
  if (!cloudSyncReady || !accountUser || !profile) return;
  const userId = accountUser.id;
  const snapshot = JSON.parse(JSON.stringify({ profile, progress }));
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    cloudSaveQueue = cloudSaveQueue.catch(() => {}).then(async () => {
      if (!cloudSyncReady || accountUser?.id !== userId) return;
      await apiRequest("/api/account/state", snapshot, "PUT");
    });
    cloudSaveQueue = cloudSaveQueue.catch((error) => {
      if (accountUser?.id === userId) showToast(`Cloud save failed: ${error.message}`);
    });
  }, 500);
}

function showView(name) {
  const views = { dashboard: elements.dashboard, lesson: elements.lesson, roadmap: elements.roadmap };
  const labels = { dashboard: "Overview", lesson: "My learning", roadmap: "Learning path" };
  Object.entries(views).forEach(([key, view]) => {
    const active = key === name;
    view.hidden = !active;
    view.classList.toggle("is-visible", active);
  });
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("is-active", link.dataset.view === name);
  });
  elements.pageLabel.textContent = labels[name];
  if (name === "lesson" && !elements.chat.childElementCount) startLesson();
  if (name === "roadmap") renderRoadmap();
  renderProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function createOptionButton(container, group, value, title, description = "", icon = "", tag = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "onboarding-option";
  button.dataset.choiceGroup = group;
  button.dataset.choice = value;
  const isSelected = String(onboardingState[group]) === value;
  button.setAttribute("aria-pressed", String(isSelected));
  if (isSelected) button.classList.add("is-selected");
  if (icon) {
    const symbol = document.createElement("span");
    symbol.className = "option-icon";
    symbol.textContent = icon;
    symbol.setAttribute("aria-hidden", "true");
    button.append(symbol);
  }
  const copy = document.createElement("span");
  copy.className = "option-copy";
  const heading = document.createElement("strong");
  heading.textContent = title;
  copy.append(heading);
  if (description) {
    const detail = document.createElement("small");
    detail.textContent = description;
    copy.append(detail);
  }
  button.append(copy);
  if (tag) {
    const badge = document.createElement("span");
    badge.className = "option-tag";
    badge.textContent = tag;
    button.append(badge);
  }
  const check = document.createElement("span");
  check.className = "option-check";
  check.setAttribute("aria-hidden", "true");
  check.textContent = "✓";
  button.append(check);
  container.append(button);
}

function setOnboardingHeader(kicker, title, description) {
  const header = document.createElement("div");
  header.className = "onboarding-heading";
  const label = document.createElement("p");
  label.className = "onboarding-kicker";
  label.textContent = kicker;
  const heading = document.createElement("h1");
  heading.id = "onboarding-title";
  heading.textContent = title;
  const detail = document.createElement("p");
  detail.className = "onboarding-description";
  detail.textContent = description;
  header.append(label, heading, detail);
  elements.onboardingContent.append(header);
}

function renderOnboarding() {
  const totalSteps = 5;
  const isReview = onboardingStep === totalSteps;
  document.querySelector("#onboarding-step-count").textContent = isReview ? "YOUR ROADMAP" : `${onboardingStep + 1} / ${totalSteps}`;
  document.querySelector("#onboarding-progress-bar").style.width = `${isReview ? 100 : ((onboardingStep + 1) / totalSteps) * 100}%`;
  document.querySelector("#onboarding-back").hidden = onboardingStep === 0;
  elements.onboardingContent.replaceChildren();
  elements.onboardingActions.replaceChildren();

  if (onboardingStep === 0) {
    setOnboardingHeader("FIRST, THE FUN PART", "What would you love to learn?", "Choose a starting point. You can always explore another path later.");
    const options = document.createElement("div");
    options.className = "onboarding-options skill-options";
    Object.entries(COURSES).filter(([id]) => id !== "custom").forEach(([id, course]) => {
      createOptionButton(options, "skill", id, course.name, course.description, course.icon, "AI PATH");
    });
    createOptionButton(options, "skill", "custom", "Something else", "Name any skill you want to learn.", "✧", "ANY SKILL");
    const skillLabel = document.createElement("label");
    skillLabel.className = "custom-goal-label";
    skillLabel.htmlFor = "custom-skill";
    skillLabel.textContent = "What skill do you want to learn? (for example: photography, cooking, or robotics)";
    const skillInput = document.createElement("input");
    skillInput.id = "custom-skill";
    skillInput.className = "custom-goal-input";
    skillInput.type = "text";
    skillInput.maxLength = 100;
    skillInput.placeholder = "Type any skill";
    skillInput.value = onboardingState.customSkill;
    elements.onboardingContent.append(options, skillLabel, skillInput);
  } else if (onboardingStep === 1) {
    setOnboardingHeader("YOUR STARTING POINT", "How familiar does this feel?", "There’s no wrong answer. We’ll shape the path around where you are today.");
    const options = document.createElement("div");
    options.className = "onboarding-options";
    [
      ["new", "I’m brand new", "Start with the friendly, bite-sized basics.", "✿"],
      ["some", "I know a little", "I’ve tried a few things and want to connect the dots.", "↗"],
      ["comfortable", "I’ve got the basics", "Skip the slow intro and give me a challenge.", "✦"]
    ].forEach(([value, title, description, icon]) => createOptionButton(options, "level", value, title, description, icon));
    elements.onboardingContent.append(options);
  } else if (onboardingStep === 2) {
    const course = COURSES[onboardingState.skill];
    if (onboardingState.skill === "custom") {
      setOnboardingHeader("YOUR STARTING POINT", `What have you tried in ${onboardingState.customSkill || "this skill"}?`, "A few words help the AI tutor begin at the right level. It’s completely okay if the answer is “nothing yet.”");
      const placementInput = document.createElement("textarea");
      placementInput.id = "placement-notes";
      placementInput.className = "custom-goal-input placement-notes-input";
      placementInput.maxLength = 800;
      placementInput.placeholder = `e.g. I have never tried ${onboardingState.customSkill || "this"} before, or: I know the basics and want to build a project.`;
      placementInput.value = onboardingState.placementNotes;
      elements.onboardingContent.append(placementInput);
    } else {
      setOnboardingHeader("A TINY LEVEL CHECK", "Let’s find your best next step.", "Pick the answer that feels right, or choose “I’m not sure yet.” This is just a guide, not a test.");
      const question = document.createElement("p");
      question.className = "quiz-question";
      question.textContent = course.quiz.question;
      const options = document.createElement("div");
      options.className = "onboarding-options quiz-options";
      course.quiz.options.forEach((option, index) => createOptionButton(options, "quizAnswer", String(index), option));
      elements.onboardingContent.append(question, options);
    }
  } else if (onboardingStep === 3) {
    const course = COURSES[onboardingState.skill];
    setOnboardingHeader("MAKE IT YOURS", "What are you learning for?", "A goal gives your roadmap somewhere meaningful to go.");
    const options = document.createElement("div");
    options.className = "onboarding-options goal-options";
    course.goals.forEach((goal, index) => createOptionButton(options, "goal", goal, goal, "", ["↗", "✦", "◈", "＋"][index]));
    const customLabel = document.createElement("label");
    customLabel.className = "custom-goal-label";
    customLabel.htmlFor = "custom-goal";
    customLabel.textContent = "Have a specific project in mind? (optional)";
    const customInput = document.createElement("input");
    customInput.id = "custom-goal";
    customInput.className = "custom-goal-input";
    customInput.type = "text";
    customInput.maxLength = 80;
    customInput.placeholder = "e.g. Make a website for my bakery";
    customInput.value = onboardingState.customGoal;
    elements.onboardingContent.append(options, customLabel, customInput);
  } else if (onboardingStep === 4) {
    setOnboardingHeader("YOUR DAILY RHYTHM", "A little, often, works wonders.", "Choose a daily target that feels easy to come back to. You can change it anytime.");
    const options = document.createElement("div");
    options.className = "onboarding-options pace-options";
    [
      ["5", "5 minutes", "A tiny daily win", "☀"],
      ["10", "10 minutes", "A nice steady rhythm", "✿"],
      ["15", "15 minutes", "Ready for a deeper dive", "✦"]
    ].forEach(([value, title, description, icon]) => createOptionButton(options, "minutes", value, title, description, icon));
    const nameLabel = document.createElement("label");
    nameLabel.className = "custom-goal-label";
    nameLabel.htmlFor = "learner-name";
    nameLabel.textContent = "What should we call you? (optional)";
    const nameInput = document.createElement("input");
    nameInput.id = "learner-name";
    nameInput.className = "custom-goal-input";
    nameInput.type = "text";
    nameInput.maxLength = 32;
    nameInput.autocomplete = "given-name";
    nameInput.placeholder = "Your first name";
    nameInput.value = onboardingState.name;
    elements.onboardingContent.append(options, nameLabel, nameInput);
  } else {
    renderOnboardingPreview();
  }

  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.className = "onboarding-continue";
  continueButton.id = "onboarding-continue";
  continueButton.textContent = isReview ? "Let’s start learning" : onboardingStep === 4 ? "Build my learning path" : "Continue";
  continueButton.disabled = !canContinue();
  const arrow = document.createElement("span");
  arrow.textContent = "→";
  continueButton.append(arrow);
  elements.onboardingActions.append(continueButton);

  if (isReview) {
    const changeButton = document.createElement("button");
    changeButton.type = "button";
    changeButton.className = "onboarding-edit";
    changeButton.id = "onboarding-change";
    changeButton.textContent = "Change my answers";
    elements.onboardingActions.append(changeButton);
  }
}

function renderOnboardingPreview() {
  const course = getCourse(onboardingState);
  setOnboardingHeader(
    generatedRoadmap ? "MADE FOR YOU" : roadmapError ? "LET’S CONNECT YOUR AI TUTOR" : "BUILDING YOUR LEARNING PATH",
    generatedRoadmap ? "Your learning path is ready!" : roadmapError ? "We need to connect your AI tutor." : "Your AI tutor is building your path…",
    generatedRoadmap
      ? "A few thoughtful steps, shaped around your goal and the time you have."
      : roadmapError
        ? "Your answers are saved here. Set up your AI provider key on this computer, then try again."
        : "Orbit is creating a plan for your skill, experience, goal, and daily learning time."
  );
  const summary = document.createElement("div");
  summary.className = "preview-summary";
  [
    [`${course.icon}  ${course.name}`, "SKILL"],
    [generatedRoadmap?.level || getRecommendedLevel(onboardingState), "AI-RECOMMENDED LEVEL"],
    [onboardingState.goal, "YOUR GOAL"],
    [`${onboardingState.minutes} minutes a day`, "DAILY TARGET"]
  ].forEach(([value, labelText]) => {
    const item = document.createElement("div");
    item.className = "preview-summary-item";
    const label = document.createElement("span");
    label.textContent = labelText;
    const detail = document.createElement("strong");
    detail.textContent = value;
    item.append(label, detail);
    summary.append(item);
  });
  const path = document.createElement("div");
  path.className = "onboarding-path-preview";
  const note = document.createElement("p");
  note.className = "preview-course-note";
  if (generatedRoadmap) {
    generatedRoadmap.phases.forEach((phase, index) => {
      const item = document.createElement("div");
      item.className = `preview-phase${index === 0 ? " is-current" : ""}`;
      const node = document.createElement("span");
      node.className = "preview-phase-node";
      node.textContent = index === 0 ? "✦" : String(index + 1);
      const copy = document.createElement("span");
      copy.className = "preview-phase-copy";
      const title = document.createElement("strong");
      title.textContent = phase.title;
      const detail = document.createElement("small");
      detail.textContent = `${phase.concepts.length} AI-planned lessons · ${phase.subtitle}`;
      copy.append(title, detail);
      item.append(node, copy);
      path.append(item);
    });
    const lessonCount = generatedRoadmap.phases.reduce((count, phase) => count + phase.concepts.length, 0);
    note.textContent = `AI placement: ${generatedRoadmap.placementSummary} Your path covers ${lessonCount} lessons across ${generatedRoadmap.phases.length} sections, from foundations to advanced, independent practice. Mastery comes from sustained practice, not a guaranteed number of lessons.`;
  } else {
    path.classList.add("is-generating");
    const loading = document.createElement("p");
    loading.className = "roadmap-loading";
    loading.textContent = roadmapError || (apiReady ? "Your AI tutor is building a learning path around your goal…" : "Connect the local server and add your AI provider key to generate an AI roadmap.");
    path.append(loading);
    note.textContent = roadmapError ? "Your answers are saved here. Fix the AI connection and retry—Orbit won't invent a curriculum when the AI is unavailable." : "Orbit will ask the cloud AI to create your learning path. Your API key stays on your computer.";
  }
  elements.onboardingContent.append(summary, path, note);
  if (!generatedRoadmap && !roadmapError) requestGeneratedRoadmap();
}

function canContinue() {
  if (onboardingStep === 0) return Boolean(onboardingState.skill) && (onboardingState.skill !== "custom" || onboardingState.customSkill.trim().length >= 2);
  if (onboardingStep === 1) return Boolean(onboardingState.level);
  if (onboardingStep === 2) return onboardingState.skill === "custom" ? onboardingState.placementNotes.trim().length >= 3 : onboardingState.quizAnswer !== -1;
  if (onboardingStep === 3) return Boolean(onboardingState.goal);
  if (onboardingStep === 5) return Boolean(generatedRoadmap);
  return true;
}

async function requestGeneratedRoadmap() {
  const requestId = ++roadmapRequestId;
  roadmapError = "";
  try {
    const course = getCourse(onboardingState);
    const levelNames = { new: "Beginner", some: "Intermediate", comfortable: "Advanced" };
    const placementNotes = onboardingState.skill === "custom"
      ? onboardingState.placementNotes
      : `${levelNames[onboardingState.level]}; ${Number(onboardingState.quizAnswer) === course.quiz.answer ? "passed the placement question" : "did not pass or was unsure on the placement question"}.`;
    const result = await apiRequest("/api/roadmap", {
      skill: onboardingState.skill === "custom" ? onboardingState.customSkill.trim() : course.name,
      learnerLevel: levelNames[onboardingState.level],
      placementNotes,
      goal: onboardingState.goal,
      customGoal: onboardingState.customGoal,
      dailyMinutes: onboardingState.minutes,
      learnerName: onboardingState.name,
      deviceId: learnerDeviceId()
    });
    if (requestId !== roadmapRequestId || onboardingStep !== 5) return;
    generatedRoadmap = result;
    renderOnboarding();
  } catch (error) {
    if (requestId !== roadmapRequestId || onboardingStep !== 5) return;
    roadmapError = error.message;
    // A skill needs an account and a used-up month needs a plan - neither is an AI connection
    // problem, so the button under the message names the thing that actually unblocks it.
    skillGateWait = error.code === "ACCOUNT_REQUIRED" ? "account"
      : error.code === "SKILL_LIMIT_REACHED" ? "plan" : "";
    renderOnboarding();
    const retry = document.createElement("button");
    retry.type = "button";
    retry.className = "onboarding-edit roadmap-retry";
    retry.id = "roadmap-retry";
    retry.textContent = skillGateWait === "account"
      ? "Sign in, then start this skill"
      : skillGateWait === "plan"
        ? "See Pro plans, then start another skill"
        : "Try the AI connection again";
    elements.onboardingActions.append(retry);
    if (skillGateWait === "account") openAccountDialog();
    else if (skillGateWait === "plan") openPlansDialog(error.message);
  }
}

// Step 5 asks for the path on its own as soon as the error is cleared, so finishing the sign-in or
// the payment is the only thing the learner has to do.
function resumeSkillStart() {
  skillGateWait = "";
  if (onboardingStep !== 5 || generatedRoadmap || !roadmapError) return;
  roadmapError = "";
  renderOnboarding();
}

function openOnboarding() {
  onboardingStep = profile && !hasComprehensiveCurriculum(profile) ? 5 : 0;
  roadmapError = "";
  skillGateWait = "";
  generatedRoadmap = null;
  roadmapRequestId += 1;
  const savedLevel = { Beginner: "new", Intermediate: "some", Advanced: "comfortable" }[profile?.level] || "";
  onboardingState = {
    name: profile?.name || "",
    skill: profile?.skill || "",
    level: profile?.selfLevel || savedLevel,
    customSkill: profile?.customSkill || "",
    quizAnswer: profile?.quizAnswer ?? -1,
    placementNotes: profile?.placementNotes || "",
    goal: profile?.goal || "",
    customGoal: profile?.customGoal || "",
    minutes: profile?.minutes || 10
  };
  elements.onboarding.hidden = false;
  document.querySelector(".app-shell").hidden = true;
  document.querySelector("#onboarding-cancel").hidden = !profile;
  renderOnboarding();
}

function completeOnboarding() {
  const course = COURSES[onboardingState.skill];
  const correct = onboardingState.skill === "custom" || Number(onboardingState.quizAnswer) === course.quiz.answer;
  const previousProfile = profile;
  const previousProgress = progress;
  const unchangedCurriculum = profile?.skill === onboardingState.skill
    && profile?.customSkill === onboardingState.customSkill
    && JSON.stringify(profile?.curriculum) === JSON.stringify(generatedRoadmap);
  profile = {
    ...onboardingState,
    curriculum: generatedRoadmap,
    quizAnswer: Number(onboardingState.quizAnswer),
    minutes: Number(onboardingState.minutes),
    selfLevel: onboardingState.level,
    level: generatedRoadmap?.level || getRecommendedLevel(onboardingState),
    placement: correct ? "Quick check passed" : "Starting with the fundamentals",
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  if (!unchangedCurriculum) {
    progress = carryProgressToCurriculum(previousProfile, previousProgress, profile);
    saveProgress();
  } else {
    progress = loadProgress();
  }
  elements.onboarding.hidden = true;
  document.querySelector(".app-shell").hidden = false;
  renderCourseDetails();
  renderProgress();
  renderAccountPanel();
  queueCloudSave();
  showView("dashboard");
  if (!course.lesson) showView("roadmap");
}

function renderCourseDetails() {
  const course = getCourse();
  const firstConcept = getCurrentConcept();
  const visual = document.querySelector(".continue-visual");
  const isPython = profile?.skill === "python";
  visual.classList.toggle("is-preview", !isPython);
  const previewArt = document.querySelector("#preview-art-label");
  previewArt.hidden = isPython;
  previewArt.textContent = course.icon;
  const windowTitle = document.querySelector(".window-top b");
  windowTitle.textContent = isPython ? "hello.py" : course.name;
  document.querySelector("#course-icon").textContent = course.icon;
  document.querySelector("#course-kicker").textContent = `${course.name.toUpperCase()} · ${profile?.level?.toUpperCase() || "BEGINNER"}`;
  document.querySelector("#lesson-card-title").textContent = firstConcept.title;
  document.querySelector("#lesson-card-description").textContent = firstConcept.objective;
  document.querySelector(".lesson-meta > span:first-child").innerHTML = `<span class="meta-clock" aria-hidden="true">◷</span> ${firstConcept.durationMinutes || 8} min`;
  document.querySelector("#continue-button-text").textContent = "Start learning";
  document.querySelector("#welcome-title").innerHTML = profile?.name
    ? `Ready for your <span>next small win, ${escapeHtml(profile.name)}?</span>`
    : "Ready for your <span>next small win?</span>";
  document.querySelector("#welcome-subtitle").textContent = profile?.goal
    ? `A little progress towards ${profile.goal.toLowerCase()}, at your own pace.`
    : "Your goals, your pace. Let’s make a little progress today.";
  document.querySelector("#journey-subtitle").textContent = `${course.name} · ${profile?.level || "Beginner"} · ${profile?.minutes || 10} min/day`;
  document.querySelector("#daily-goal-note").textContent = `Your daily target: ${profile?.minutes || 10} focused minutes. Every small session counts.`;
  const skillLink = document.querySelector(".skill-link");
  skillLink.querySelector(".python-icon").textContent = course.icon;
  skillLink.querySelector(".skill-link-copy strong").textContent = course.name;
  skillLink.querySelector(".skill-link-copy small").textContent = profile?.level || "Beginner path";
  const needsCurriculumExpansion = Boolean(profile) && !hasComprehensiveCurriculum(profile);
  document.querySelector("#curriculum-depth-note").hidden = !needsCurriculumExpansion;
  document.querySelector("#edit-plan").textContent = needsCurriculumExpansion ? "Expand my learning path" : "Update my learning plan";
  const coursePhases = getPhases();
  const activePhase = Math.max(0, coursePhases.findIndex((phase) => progress.currentConcept >= phase.start && progress.currentConcept < phase.end));
  const previewStart = Math.min(activePhase, Math.max(0, coursePhases.length - 3));
  const preview = document.querySelector("#roadmap-preview-list");
  preview.replaceChildren();
  coursePhases.slice(previewStart, previewStart + 3).forEach((phase, offset) => {
    const phaseIndex = previewStart + offset;
    const mastered = progress.masteredConcepts.filter((concept) => concept >= phase.start && concept < phase.end).length;
    const isComplete = mastered === phase.end - phase.start;
    const isCurrent = phaseIndex === activePhase && !isComplete;
    const step = document.createElement("div");
    step.className = `roadmap-step${isCurrent ? " is-current" : isComplete ? " is-complete" : " is-upcoming"}`;
    const node = document.createElement("span");
    node.className = "roadmap-node";
    node.textContent = isComplete ? "✓" : String(phaseIndex + 1);
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = phase.title;
    const detail = document.createElement("small");
    detail.textContent = `${phase.end - phase.start} lessons · ${phase.subtitle}`;
    copy.append(title, detail);
    step.append(node, copy);
    if (isCurrent) {
      const tag = document.createElement("span");
      tag.className = "step-tag";
      tag.textContent = "YOU ARE HERE";
      step.append(tag);
    } else if (!isComplete) {
      const locked = document.createElement("span");
      locked.className = "lock-icon";
      locked.setAttribute("aria-label", "Locked");
      locked.textContent = "⌑";
      step.append(locked);
    }
    preview.append(step);
  });
  const previewMore = document.querySelector("#roadmap-preview-more");
  previewMore.replaceChildren(document.createTextNode(
    `${coursePhases.length > 3 ? `Showing 3 of ${coursePhases.length} sections · ` : `${coursePhases.length} sections · `}${getConcepts().length} lessons · `
  ));
  const previewProgress = document.createElement("span");
  previewProgress.id = "roadmap-progress";
  previewProgress.textContent = `${Math.round((progress.masteredConcepts.length / getConcepts().length) * 100)}%`;
  previewMore.append(previewProgress, document.createTextNode(" complete"));
  document.querySelector("#roadmap-title").textContent = `${course.name}: your next steps.`;
  document.querySelector("#roadmap-description").textContent = `${course.description} This path is tailored to your ${profile?.level?.toLowerCase() || "beginner"} starting point.`;
  document.querySelector("#path-course-name").textContent = `${course.name} · ${profile?.level || "Beginner"}`;
  document.querySelector("#path-course-icon").textContent = course.icon;
  const recommendedDays = getPhases().reduce((total, phase) => total + getSectionDayPlan(phase).days, 0);
  document.querySelector("#path-course-details").textContent = `${getConcepts().length} lessons · ${recommendedDays} recommended study days · ${profile?.minutes || 10} min/day`;
  document.querySelector(".roadmap-continue").hidden = false;
}

function getRecommendedLevel(plan) {
  if (plan.skill === "custom") {
    return { new: "Beginner", some: "Intermediate", comfortable: "Advanced" }[plan.level] || "Beginner";
  }
  const course = COURSES[plan.skill];
  const passed = Number(plan.quizAnswer) === course.quiz.answer;
  if (plan.level === "new") return "Beginner";
  if (plan.level === "some") return passed ? "Intermediate" : "Beginner";
  return passed ? "Advanced" : "Intermediate";
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = value;
  return node.innerHTML;
}

function addMessage(role, text, track = true, assessment = "", question = "", options = [], activityType = "multiple_choice") {
  const message = document.createElement("article");
  const feedbackClass = assessment === "correct"
    ? "is-correct"
    : assessment === "partial" || assessment === "incorrect" ? "is-coaching" : "";
  message.className = `message ${role === "user" ? "user-message" : role === "system" ? "system-message" : "tutor-message"} ${feedbackClass}`.trim();
  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "user" ? "Y" : role === "system" ? "!" : "✦";

  const content = document.createElement("div");
  content.className = "message-content";
  const author = document.createElement("span");
  author.className = "message-author";
  author.textContent = role === "user" ? "You" : role === "system" ? "Connection status" : "Your learning guide";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  if (feedbackClass) {
    const feedback = document.createElement("span");
    feedback.className = "feedback-chip";
    feedback.textContent = assessment === "correct"
      ? "Checkpoint passed"
      : assessment === "partial" ? "Almost there" : "Let's try a smaller step";
    bubble.append(feedback);
  }
  appendRichText(bubble, text);
  content.append(author, bubble);
  if (role === "tutor" && question && options.length >= 2) {
    const challenge = document.createElement("section");
    challenge.className = `answer-challenge activity-${activityType}`;
    const label = document.createElement("span");
    label.className = "challenge-label";
    const activityLabels = {
      multiple_choice: "CHOOSE THE BEST ANSWER",
      fill_blank: "COMPLETE THE SENTENCE",
      word_bank: "BUILD YOUR ANSWER",
      real_world: "WHAT WOULD YOU DO?"
    };
    label.textContent = activityLabels[activityType] || activityLabels.multiple_choice;
    const prompt = document.createElement("h3");
    prompt.className = "challenge-question";
    if (activityType === "fill_blank") {
      const blankMatch = question.match(/_{2,}|\[\s*blank\s*\]/i);
      if (blankMatch) {
        prompt.append(document.createTextNode(question.slice(0, blankMatch.index)));
        const blank = document.createElement("span");
        blank.className = "question-blank";
        blank.setAttribute("aria-label", "missing word");
        blank.textContent = " ?";
        prompt.append(blank, document.createTextNode(question.slice(blankMatch.index + blankMatch[0].length)));
      } else {
        prompt.textContent = question;
        const blank = document.createElement("span");
        blank.className = "question-blank";
        blank.textContent = " ?";
        prompt.append(" ", blank);
      }
    } else {
      prompt.textContent = question;
    }
    const answers = document.createElement("div");
    answers.className = "answer-options";
    answers.setAttribute("role", "group");
    answers.setAttribute("aria-label", "Choose an answer");
    if (activityType === "word_bank") {
      const assembledAnswer = document.createElement("div");
      assembledAnswer.className = "word-bank-assembled";
      assembledAnswer.setAttribute("aria-live", "polite");
      assembledAnswer.textContent = "Tap words to build your answer";
      const wordTokens = document.createElement("div");
      wordTokens.className = "word-bank-tokens";
      const selectedWords = [];
      options.forEach((option, index) => {
        const token = document.createElement("button");
        token.className = "word-token";
        token.type = "button";
        token.textContent = option;
        token.setAttribute("aria-pressed", "false");
        token.addEventListener("click", () => {
          const selectedIndex = selectedWords.indexOf(index);
          if (selectedIndex >= 0) {
            selectedWords.splice(selectedIndex, 1);
            token.classList.remove("is-picked");
            token.setAttribute("aria-pressed", "false");
          } else {
            selectedWords.push(index);
            token.classList.add("is-picked");
            token.setAttribute("aria-pressed", "true");
          }
          assembledAnswer.textContent = selectedWords.length
            ? selectedWords.map((wordIndex) => options[wordIndex]).join(" ")
            : "Tap words to build your answer";
          checkAnswer.disabled = selectedWords.length === 0;
        });
        wordTokens.append(token);
      });
      const checkAnswer = document.createElement("button");
      checkAnswer.className = "word-bank-check";
      checkAnswer.type = "button";
      checkAnswer.textContent = "Check answer";
      checkAnswer.disabled = true;
      checkAnswer.addEventListener("click", () => {
        if (selectedWords.length) submitAnswer(selectedWords.map((wordIndex) => options[wordIndex]).join(" "), challenge);
      });
      challenge.append(label, prompt, assembledAnswer, wordTokens, checkAnswer);
      challenge.resetSelection = () => {
        selectedWords.length = 0;
        wordTokens.querySelectorAll(".word-token").forEach((token) => {
          token.classList.remove("is-picked");
          token.setAttribute("aria-pressed", "false");
        });
        assembledAnswer.textContent = "Tap words to build your answer";
        checkAnswer.disabled = true;
      };
      content.append(challenge);
    } else {
      let selectedOption = "";
      options.forEach((option, index) => {
        const answer = document.createElement("button");
        answer.className = "answer-option";
        answer.type = "button";
        answer.dataset.answerOption = "";
        answer.setAttribute("aria-pressed", "false");
        const letter = document.createElement("span");
        letter.className = "answer-option-letter";
        letter.textContent = String.fromCharCode(65 + index);
        const answerText = document.createElement("span");
        answerText.className = "answer-option-copy";
        answerText.textContent = option;
        const arrow = document.createElement("span");
        arrow.className = "answer-option-arrow";
        arrow.setAttribute("aria-hidden", "true");
        arrow.textContent = "→";
        answer.append(letter, answerText, arrow);
        answer.addEventListener("click", () => {
          selectedOption = selectedOption === option ? "" : option;
          answers.querySelectorAll("[data-answer-option]").forEach((choice) => {
            const selected = choice.querySelector(".answer-option-copy").textContent === selectedOption;
            choice.classList.toggle("is-selected", selected);
            choice.setAttribute("aria-pressed", String(selected));
          });
          checkAnswer.disabled = !selectedOption;
        });
        answers.append(answer);
      });
      const checkAnswer = document.createElement("button");
      checkAnswer.className = "challenge-check";
      checkAnswer.type = "button";
      checkAnswer.textContent = "Check answer";
      checkAnswer.disabled = true;
      checkAnswer.addEventListener("click", () => {
        if (selectedOption) submitAnswer(selectedOption, challenge);
      });
      challenge.append(label, prompt, answers, checkAnswer);
      // The card remembers its own pick, so a failed AI call must clear it or the retry tap deselects.
      challenge.resetSelection = () => {
        selectedOption = "";
        answers.querySelectorAll("[data-answer-option]").forEach((choice) => {
          choice.classList.remove("is-selected");
          choice.setAttribute("aria-pressed", "false");
        });
        checkAnswer.disabled = true;
      };
    }
    if (activityType !== "word_bank") content.append(challenge);
  }
  message.append(avatar, content);
  elements.chat.append(message);
  if (track && role !== "system") {
    const historyText = role === "tutor" && question
      ? `${text}\nActivity type: ${activityType}\nQuestion: ${question}\nOptions: ${options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join("\n")}`
      : text;
    lessonHistory.push({ role: role === "user" ? "user" : "model", text: historyText });
  }
  elements.chat.scrollTop = elements.chat.scrollHeight;
}

function setTutorThinking(isThinking) {
  const avatar = document.querySelector(".tutor-avatar");
  const presence = document.querySelector("#tutor-presence");
  avatar.classList.toggle("is-thinking", isThinking);
  presence.textContent = isThinking ? "Thinking through your answer…" : "Here to help, always";
  if (isThinking) {
    document.querySelector("#lesson-guide-stage").classList.add("is-thinking");
    tutorThinkingNode = document.createElement("article");
    tutorThinkingNode.className = "message tutor-message thinking-message";
    tutorThinkingNode.setAttribute("aria-label", "Your learning guide is thinking");
    tutorThinkingNode.innerHTML = '<span class="message-avatar" aria-hidden="true">✦</span><div class="message-content"><span class="message-author">Your learning guide</span><div class="message-bubble thinking-bubble"><i></i><i></i><i></i></div></div>';
    elements.chat.append(tutorThinkingNode);
    elements.chat.scrollTop = elements.chat.scrollHeight;
  } else {
    document.querySelector("#lesson-guide-stage").classList.remove("is-thinking");
    tutorThinkingNode?.remove();
    tutorThinkingNode = null;
  }
}

function reactToLessonAssessment(assessment) {
  const stage = document.querySelector("#lesson-guide-stage");
  stage.classList.toggle("is-correct", assessment === "correct");
  stage.classList.toggle("is-coaching", assessment === "partial" || assessment === "incorrect");
  if (assessment === "correct") {
    document.querySelector("#stage-guide-title").textContent = "Brilliant work!";
    document.querySelector("#stage-guide-message").textContent = "You got it. Let’s build on that.";
  } else if (assessment === "partial" || assessment === "incorrect") {
    document.querySelector("#stage-guide-title").textContent = "Let’s try another way";
    document.querySelector("#stage-guide-message").textContent = "Mistakes are part of learning. You’ve got this!";
  }
  if (assessment === "correct" || assessment === "partial" || assessment === "incorrect") {
    setTimeout(() => {
      stage.classList.remove("is-correct", "is-coaching");
      updateSessionStep();
    }, 1400);
  }
}

function celebrateXP(points, lessonComplete = false) {
  const celebration = document.createElement("div");
  celebration.className = `xp-celebration${lessonComplete ? " is-lesson-complete" : ""}`;
  celebration.setAttribute("aria-hidden", "true");
  const reward = document.createElement("strong");
  reward.textContent = lessonComplete ? `Lesson mastered · +${points} XP` : `+${points} XP`;
  celebration.append(reward);
  for (let index = 0; index < 12; index += 1) {
    const spark = document.createElement("i");
    spark.className = "xp-spark";
    spark.style.setProperty("--spark-index", String(index));
    celebration.append(spark);
  }
  document.querySelector(".tutor-panel").append(celebration);
  setTimeout(() => celebration.remove(), 1500);
}

function getCurrentConcept() {
  const curriculum = profile?.curriculum;
  const generated = curriculum?.phases?.flatMap((phase) => phase.concepts) || [];
  const index = Math.max(0, Math.min(getConcepts().length - 1, Number(progress.currentConcept) || 0));
  if (generated[index]) return { ...generated[index], title: generated[index].title, index };
  const title = getConcepts()[index] || getConcepts()[0] || getCourse().name;
  return {
    title,
    objective: `Understand the essential ideas behind ${title} in ${getCourse().name}.`,
    exercise: `Explain ${title} in your own words and try one small example.`,
    durationMinutes: 8,
    index
  };
}

function renderLessonDetails() {
  const course = getCourse();
  const concept = getCurrentConcept();
  document.querySelector("#lesson-course-icon").textContent = course.icon;
  document.querySelector("#lesson-course-name").textContent = course.name.toUpperCase();
  document.querySelector("#lesson-title").textContent = concept.title;
  document.querySelector("#lesson-subtitle").textContent = `Concept ${concept.index + 1} of ${getConcepts().length} · ${profile?.minutes || 10} min/day`;
  document.querySelector("#concept-title").textContent = concept.title;
  document.querySelector("#concept-objective").textContent = concept.objective;
  document.querySelector("#concept-exercise").textContent = concept.exercise;
}

function getConceptStats(index = getCurrentConcept().index) {
  const saved = progress.conceptStats?.[index];
  return {
    attempts: Number.isInteger(saved?.attempts) ? saved.attempts : 0,
    correct: Number.isInteger(saved?.correct) ? saved.correct : 0
  };
}

const QUIZ_QUESTION_COUNT = 6;

function appendRichText(target, text) {
  const inlineCode = /`([^`]+)`/g;
  let cursor = 0;
  let match;
  while ((match = inlineCode.exec(text)) !== null) {
    target.append(document.createTextNode(text.slice(cursor, match.index)));
    const code = document.createElement("code");
    code.textContent = match[1];
    target.append(code);
    cursor = inlineCode.lastIndex;
  }
  target.append(document.createTextNode(text.slice(cursor)));
}

function tutorCard(kind) {
  const message = document.createElement("article");
  message.className = `message tutor-message ${kind}`;
  const avatar = document.createElement("span");
  avatar.className = "message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = "✦";
  const content = document.createElement("div");
  content.className = "message-content";
  message.append(avatar, content);
  elements.chat.append(message);
  elements.chat.scrollTop = elements.chat.scrollHeight;
  return { message, content };
}

let tutorRequestInFlight = false;

function freshSession() {
  return { stage: "brief", title: "", sections: [], sectionIndex: 0, quizTotal: QUIZ_QUESTION_COUNT, results: [], pending: null };
}

function getSession() {
  const session = progress.session;
  return session && session.conceptIndex === getCurrentConcept().index ? session : null;
}

function saveSession(patch) {
  progress.session = { ...freshSession(), ...getSession(), conceptIndex: getCurrentConcept().index, ...patch };
  saveProgress();
  return progress.session;
}

// The tutor is stateless between calls, so a resumed lesson or quiz rebuilds the conversation
// from the stored results instead of spending another request on it.
function seedHistoryFromSession(session) {
  lessonHistory = session.results.flatMap((result) => [
    { role: "model", text: `Question: ${result.question}` },
    { role: "user", text: `My answer: ${result.answer}` }
  ]);
}

function lessonDigest(session) {
  return session.sections
    .map((section, index) => `${index + 1}. ${section.heading} — ${section.body}`)
    .join("\n")
    .slice(0, 1800);
}

function renderBrief(reply, syllabus) {
  const { content } = tutorCard("brief-card");
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  appendRichText(bubble, reply);
  const list = document.createElement("ul");
  list.className = "brief-syllabus";
  syllabus.forEach((item) => {
    const row = document.createElement("li");
    row.className = "brief-item";
    row.textContent = item;
    list.append(row);
  });
  const caption = document.createElement("p");
  caption.className = "brief-caption";
  caption.textContent = "Pehle pura topic padhoge, phir uske hisaab se sawaal, aur ant me score.";
  const actions = document.createElement("div");
  actions.className = "brief-actions";
  const start = document.createElement("button");
  start.type = "button";
  start.className = "brief-start";
  start.textContent = "Haan, shuru karo";
  start.addEventListener("click", () => {
    actions.remove();
    caption.remove();
    requestTutorReply("lesson");
  });
  actions.append(start);
  content.append(bubble, list, caption, actions);
}

function renderLessonSection(session) {
  const stored = document.querySelector("#lesson-card");
  const card = stored || tutorCard("lesson-card").message;
  if (!stored) card.id = "lesson-card";
  const content = card.querySelector(".message-content");
  const section = session.sections[session.sectionIndex];
  if (!section) return;
  content.replaceChildren();

  const tag = document.createElement("span");
  tag.className = "lesson-section-tag";
  tag.textContent = `PADHAI · SECTION ${session.sectionIndex + 1} / ${session.sections.length}`;
  const heading = document.createElement("h3");
  heading.className = "lesson-section-heading";
  heading.textContent = section.heading;
  const body = document.createElement("div");
  body.className = "lesson-body";
  appendRichText(body, section.body);
  content.append(tag, heading, body);

  if (section.example) {
    const example = document.createElement("div");
    example.className = "lesson-example";
    const label = document.createElement("span");
    label.className = "lesson-example-label";
    label.textContent = "EXAMPLE";
    const exampleBody = document.createElement("div");
    exampleBody.className = "lesson-example-body";
    appendRichText(exampleBody, section.example);
    example.append(label, exampleBody);
    content.append(example);
  }

  const isLast = session.sectionIndex === session.sections.length - 1;
  const nav = document.createElement("div");
  nav.className = "lesson-nav";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "lesson-back";
  back.textContent = "← Peeche";
  back.disabled = session.sectionIndex === 0;
  back.addEventListener("click", () => {
    renderLessonSection(saveSession({ sectionIndex: session.sectionIndex - 1 }));
  });
  const forward = document.createElement("button");
  forward.type = "button";
  forward.className = "lesson-forward";
  forward.textContent = isLast ? "Quiz shuru karo →" : "Aage →";
  forward.addEventListener("click", () => {
    if (isLast) {
      startQuiz();
      return;
    }
    renderLessonSection(saveSession({ sectionIndex: session.sectionIndex + 1 }));
  });
  nav.append(back, forward);
  content.append(nav);
  updateSessionStep();
  elements.chat.scrollTop = elements.chat.scrollHeight;
}

function renderQuizMeter() {
  const session = getSession();
  const node = document.querySelector("#quiz-meter");
  if (!session || session.stage !== "quiz") {
    node?.remove();
    return;
  }
  const text = `Sawaal ${Math.min(session.results.length + 1, session.quizTotal)} / ${session.quizTotal}`;
  if (node) {
    node.textContent = text;
    return;
  }
  const meter = document.createElement("p");
  meter.id = "quiz-meter";
  meter.className = "quiz-meter";
  meter.textContent = text;
  elements.chat.append(meter);
}

function startQuiz() {
  saveSession({ stage: "quiz", results: [], pending: null });
  seedHistoryFromSession(getSession());
  updateSessionStep();
  requestTutorReply("quiz");
}

function renderScoreCard() {
  const session = getSession();
  const total = session.results.length;
  const correct = session.results.filter((result) => result.correct).length;
  const score = total ? Math.round((correct / total) * 100) : 0;
  const { content } = tutorCard("score-card");

  const tag = document.createElement("span");
  tag.className = "score-tag";
  tag.textContent = "SESSION COMPLETE";
  const value = document.createElement("div");
  value.className = "score-value";
  const number = document.createElement("strong");
  number.textContent = String(score);
  const percent = document.createElement("small");
  percent.textContent = "%";
  const tally = document.createElement("span");
  tally.className = "score-tally";
  tally.textContent = `${correct} / ${total} sahi`;
  value.append(number, percent, tally);
  const verdict = document.createElement("p");
  verdict.className = "score-verdict";
  verdict.textContent = score >= 80
    ? "Zabardast — poora topic samajh aa gaya. Agla lesson kholo."
    : score >= 50
      ? "Achhi pakad. Neeche diye gaye hisse ek baar aur padh ke quiz dobara de sakte ho."
      : "Koi baat nahi — lesson shuru se padho, phir quiz dobara try karo.";
  content.append(tag, value, verdict);

  const rows = document.createElement("div");
  rows.className = "score-rows";
  session.results.forEach((result, index) => {
    const row = document.createElement("div");
    row.className = `score-row ${result.correct ? "is-correct" : "is-wrong"}`;
    const mark = document.createElement("span");
    mark.className = "score-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = result.correct ? "✓" : "✕";
    const copy = document.createElement("div");
    copy.className = "score-copy";
    const question = document.createElement("p");
    question.className = "score-question";
    question.textContent = `${index + 1}. ${result.question}`;
    const answer = document.createElement("p");
    answer.className = "score-answer";
    answer.textContent = `Tumhara jawab: ${result.answer}`;
    copy.append(question, answer);
    row.append(mark, copy);
    rows.append(row);
  });
  content.append(rows);

  const actions = document.createElement("div");
  actions.className = "score-actions";
  const reread = document.createElement("button");
  reread.type = "button";
  reread.className = "score-reread";
  reread.textContent = "Lesson dobara padho";
  reread.addEventListener("click", () => {
    const again = saveSession({ stage: "lesson", sectionIndex: 0, results: [], pending: null });
    document.querySelector("#quiz-meter")?.remove();
    renderLessonSection(again);
  });
  actions.append(reread);
  content.append(actions);
  updateSessionStep();
  elements.chat.scrollTop = elements.chat.scrollHeight;
}

function startLesson() {
  const concept = getCurrentConcept();
  lessonStartedAt = Date.now();
  elements.answer.disabled = false;
  elements.send.disabled = false;
  lessonHistory = [];
  document.querySelector("#lesson-next").hidden = true;
  renderLessonDetails();
  progress.mastery = Number(progress.masteryByConcept?.[concept.index]) || 0;
  renderProgress();
  updateSessionStep();

  if (progress.phase === "complete") {
    addMessage("tutor", "You have already mastered this lesson. Review the objective or pick any unlocked lesson from your learning path.", false);
    elements.answer.disabled = true;
    elements.send.disabled = true;
    showLessonNext();
    return;
  }

  const session = getSession();
  if (!session) {
    requestTutorReply("brief");
    return;
  }
  seedHistoryFromSession(session);
  if (session.stage === "lesson" && session.sections.length) {
    renderLessonSection(session);
    return;
  }
  if (session.stage === "quiz" && session.pending) {
    addMessage("tutor", session.pending.reply, true, "", session.pending.question, session.pending.options, session.pending.activityType);
    renderQuizMeter();
    return;
  }
  if (session.stage === "score") {
    renderScoreCard();
    return;
  }
  requestTutorReply("brief");
}

function recordStudyDay() {
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = dateKey(new Date());
  if (progress.lastStudyDate === today) return;
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dateKey(yesterdayDate);
  progress.streak = progress.lastStudyDate === yesterday ? progress.streak + 1 : 1;
  progress.lastStudyDate = today;
}

function updateMastery(value) {
  progress.mastery = Math.max(progress.mastery, Math.min(100, value));
  const conceptIndex = getCurrentConcept().index;
  progress.masteryByConcept = { ...progress.masteryByConcept, [conceptIndex]: progress.mastery };
  saveProgress();
  renderProgress();
}

function updateSessionStep() {
  const session = getSession();
  const stage = session?.stage || "brief";
  const complete = progress.phase === "complete";
  const stepNumber = complete ? 3 : stage === "quiz" ? 2 : stage === "score" ? 3 : 1;
  const titles = ["Learn the topic", "Quiz on the whole topic", "Your score"];
  const descriptions = [
    "Your tutor teaches the topic from A to Z, one section at a time.",
    "Questions drawn from every section of the lesson, with feedback after each answer.",
    "See how many you got right, then move on or read the lesson again."
  ];
  const guides = {
    brief: ["Ready to learn?", "Pehle padho, phir quiz. Ek step at a time."],
    lesson: ["Padho, ek section ke baad doosra", "Jab samajh aa jaye tab “Aage” dabao."],
    quiz: ["Quiz time", "Jo padha, bas wahi puchha jayega."],
    score: ["Session complete", "Score card me poora hisaab dekho."]
  };
  const guideMessages = complete
    ? ["You did it! A whole new skill unlocked.", "That’s a win worth celebrating!"]
    : guides[stage];
  document.querySelector("#session-step-title").textContent = complete ? "Mastery achieved" : titles[stepNumber - 1];
  document.querySelector("#session-step-count").textContent = complete ? "ALL STEPS COMPLETE" : `STEP ${stepNumber} OF 3`;
  document.querySelector("#session-step-description").textContent = complete
    ? "You cleared the quiz. Continue to your next lesson when ready."
    : descriptions[stepNumber - 1];
  document.querySelector("#stage-guide-title").textContent = guideMessages[0];
  document.querySelector("#stage-guide-message").textContent = guideMessages[1];
  [1, 2, 3].forEach((number) => {
    const dot = document.querySelector(`#step-dot-${number}`);
    dot.classList.toggle("is-active", !complete && number === stepNumber);
    dot.classList.toggle("is-complete", complete || number < stepNumber);
  });
  const railStage = complete ? "complete" : stage === "quiz" ? "practice" : stage === "score" ? "mastery" : "learn";
  const railOrder = { learn: 0, practice: 1, mastery: 2, complete: 3 };
  document.querySelectorAll(".lesson-rail-step").forEach((item) => {
    const itemOrder = railOrder[item.dataset.lessonStage];
    item.classList.toggle("is-active", item.dataset.lessonStage === railStage);
    item.classList.toggle("is-complete", complete || itemOrder < railOrder[railStage]);
  });
  // Only the finished lesson closes the box; a doubt can be asked at any other moment.
  elements.answer.disabled = complete;
  elements.send.disabled = complete;
  document.querySelector("#composer-hint").textContent = complete
    ? "Lesson complete"
    : stage === "quiz"
      ? `${session.results.length}/${session.quizTotal} jawab · ${progress.xp} XP earned`
      : stage === "lesson"
        ? `Section ${session.sectionIndex + 1} of ${session.sections.length} — padho, phir Aage dabao`
        : "Koi doubt ho to yahin puch lo.";
  elements.answer.placeholder = stage === "quiz"
    ? "Upar jawab tap karo — ya koi sawaal ho to “?” ke saath yahan likho…"
    : "Koi sawaal? Yahan puchho — padhai wahin se continue hogi…";
}

function showLessonNext() {
  const next = document.querySelector("#lesson-next");
  const isLast = getCurrentConcept().index >= getConcepts().length - 1;
  next.hidden = false;
  next.innerHTML = isLast
    ? 'View your learning path <span aria-hidden="true">→</span>'
    : 'Continue to next lesson <span aria-hidden="true">→</span>';
}

function finishLesson(reply) {
  const conceptIndex = getCurrentConcept().index;
  progress.phase = "complete";
  progress.minutes += Math.max(1, Math.ceil((Date.now() - lessonStartedAt) / 60000));
  progress.xp += 10;
  recordStudyDay();
  if (!progress.masteredConcepts.includes(conceptIndex)) progress.masteredConcepts.push(conceptIndex);
  progress.mastery = Math.max(80, progress.mastery);
  progress.masteryByConcept = { ...progress.masteryByConcept, [conceptIndex]: progress.mastery };
  saveProgress();
  addMessage("tutor", reply, true, "correct");
  elements.answer.disabled = true;
  elements.send.disabled = true;
  updateSessionStep();
  showLessonNext();
  renderProgress();
  renderRoadmap();
  celebrateXP(11, true);
  showToast("Lesson mastered! +11 XP");
}

async function requestTutorReply(mode, userMessage = "", sourceChallenge = null) {
  // Every phase of a session costs an AI call the learner is budgeted for, so a double tap must not fire two.
  if (tutorRequestInFlight) return;
  tutorRequestInFlight = true;
  const concept = getCurrentConcept();
  const course = getCourse();
  // A resumed quiz starts on the tutor's own question, and dropping that turn would leave the
  // model grading an answer it has never seen the question for. The anchor replaces the oldest
  // turn rather than adding an eleventh, because the server caps history at ten messages.
  let history = lessonHistory.slice(-10);
  if (history[0]?.role === "model") {
    history = lessonHistory.slice(-9);
    history.unshift({ role: "user", text: "I finished the lesson. Ask me the next question." });
  }
  elements.send.disabled = true;
  elements.answer.disabled = true;
  document.querySelector("#composer-hint").textContent = "Your AI tutor is thinking…";
  setTutorThinking(true);
  try {
    const stats = getConceptStats(concept.index);
    const session = getSession() || freshSession();
    // The final answer gets a closing verdict instead of a seventh question.
    const requestMode = mode === "answer" && session.results.length + 1 >= session.quizTotal ? "finish" : mode;
    const result = await apiRequest("/api/tutor", {
      skill: course.name,
      level: getRecommendedLevel(profile || {}),
      goal: [profile?.goal, profile?.customGoal].filter(Boolean).join("; ") || `Learn ${course.name}`,
      concept: concept.title,
      objective: concept.objective,
      exercise: concept.exercise,
      mastery: progress.mastery,
      attemptsInConcept: stats.attempts,
      correctAnswers: session.results.filter((item) => item.correct).length,
      // In answer mode the learner is replying to question results.length + 1, so the next one is one further.
      quizIndex: session.results.length + (mode === "answer" ? 1 : 0),
      quizTotal: session.quizTotal,
      lessonOutline: session.sections.map((section) => section.heading),
      lessonDigest: lessonDigest(session),
      mode: requestMode,
      history,
      deviceId: learnerDeviceId()
    });
    sourceChallenge?.querySelectorAll(".answer-option, .word-token, .word-bank-check, .challenge-check").forEach((option) => {
      option.disabled = true;
      if (option.matches("[data-answer-option]")) {
        option.classList.toggle("is-selected", option.querySelector(".answer-option-copy").textContent === userMessage);
      }
    });

    if (result.phase === "brief") {
      saveSession({ stage: "brief" });
      renderBrief(result.reply, result.syllabus);
      lessonHistory.push({ role: "model", text: `Told the learner the topic covers: ${result.syllabus.join(", ")} and asked whether to start.` });
      return;
    }

    if (result.phase === "doubt") {
      addMessage("tutor", result.reply, true);
      return;
    }

    if (result.phase === "lesson") {
      const stored = saveSession({
        stage: "lesson",
        title: result.lesson.title,
        sections: result.lesson.sections,
        quizTotal: result.lesson.questionCount,
        sectionIndex: 0,
        results: [],
        pending: null
      });
      progress.phase = "exercise";
      saveProgress();
      if (result.reply) addMessage("tutor", result.reply, true);
      renderLessonSection(stored);
      return;
    }

    const isCorrect = result.assessment === "correct";
    if (userMessage) {
      const currentStats = getConceptStats(concept.index);
      progress.conceptStats = {
        ...progress.conceptStats,
        [concept.index]: {
          attempts: currentStats.attempts + 1,
          correct: currentStats.correct + Number(isCorrect)
        }
      };
      progress.attempts += 1;
      if (isCorrect) {
        progress.correctAnswers += 1;
        progress.xp += 1;
        celebrateXP(1);
        showToast("Sahi jawab · +1 XP");
        updateMastery(Math.min(79, progress.mastery + result.masteryDelta));
      }
      recordStudyDay();
      progress.phase = "exercise";
      saveProgress();
      reactToLessonAssessment(result.assessment);
    }

    const results = userMessage
      ? [...session.results, { question: session.pending?.question || "", answer: userMessage, correct: isCorrect }]
      : session.results;

    if (result.phase === "verdict" || results.length >= session.quizTotal) {
      const correctCount = results.filter((item) => item.correct).length;
      const score = Math.round((correctCount / results.length) * 100);
      saveSession({ stage: "score", results, pending: null });
      addMessage("tutor", result.reply, true, userMessage ? result.assessment : "");
      updateMastery(score);
      renderQuizMeter();
      renderScoreCard();
      if (score >= 80) finishLesson(`${correctCount} of ${results.length} quiz questions right — this topic is yours.`);
      return;
    }

    saveSession({
      stage: "quiz",
      results,
      pending: { question: result.question, options: result.options, activityType: result.activityType, reply: result.reply }
    });
    addMessage("tutor", result.reply, true, userMessage ? result.assessment : "", result.question, result.options, result.activityType);
    renderQuizMeter();
  } catch (error) {
    if (userMessage && lessonHistory.at(-1)?.role === "user") lessonHistory.pop();
    sourceChallenge?.resetSelection?.();
    sourceChallenge?.querySelectorAll(".answer-option, .word-token").forEach((option) => {
      option.disabled = false;
    });
    addMessage("system", error.message, false);
    if (error.code === "AI_BUDGET_EXCEEDED") openPlansDialog(error.message);
    else showToast(error.message);
  } finally {
    tutorRequestInFlight = false;
    setTutorThinking(false);
    if (progress.phase !== "complete") {
      updateSessionStep();
    }
  }
}

function handleAnswer() {
  const answer = elements.answer.value.trim();
  if (!answer) {
    showToast("Write a little something first — even a guess is welcome.");
    elements.answer.focus();
    return;
  }

  submitAnswer(answer);
}

function submitAnswer(answer, sourceChallenge = null) {
  addMessage("user", answer);
  elements.answer.value = "";
  // Typing while a question is on screen answers it; anything else is the learner asking.
  // A line ending in a question mark is treated as a doubt so it is never graded or counted,
  // and the pending question stays open for the real answer.
  const isDoubt = getSession()?.stage !== "quiz" || /[?¿]\s*$/.test(answer);
  requestTutorReply(isDoubt ? "doubt" : "answer", answer, isDoubt ? null : sourceChallenge);
}

function renderProgress() {
  const masteredCount = progress.masteredConcepts.length;
  const concepts = getConcepts();
  const overall = Math.round((masteredCount / concepts.length) * 100);
  const activeMastery = Number(progress.masteryByConcept?.[progress.currentConcept]) || progress.mastery || 0;
  progress.mastery = activeMastery;
  document.querySelector("#mastery-value").textContent = String(activeMastery);
  document.querySelector("#mastery-bar").style.width = `${activeMastery}%`;
  document.querySelector("#lesson-mastery").textContent = `${activeMastery}%`;
  document.querySelector("#lesson-progress-bar").style.width = `${activeMastery}%`;
  document.querySelector("#mastery-caption").textContent = activeMastery >= 80 ? "Concept mastered — fantastic!" : activeMastery > 0 ? "You’re making a start" : "A fresh start";
  document.querySelector("#lesson-card-status").textContent = activeMastery >= 80 ? "Concept mastered" : activeMastery > 0 ? "In progress" : "Ready when you are";
  document.querySelector("#continue-button-text").textContent = getCourse().lesson
    ? activeMastery >= 80 ? "Review lesson" : activeMastery > 0 ? "Continue learning" : "Start learning"
    : "Preview my path";
  document.querySelector("#roadmap-progress").textContent = `${overall}%`;
  document.querySelector("#path-progress").textContent = String(overall);
  document.querySelector("#minutes-stat").innerHTML = `${progress.minutes} <small>min</small>`;
  document.querySelector("#concepts-stat").innerHTML = `${masteredCount} <small>/ ${concepts.length}</small>`;
  document.querySelector("#streak-count").textContent = String(progress.streak);
  document.querySelector("#xp-count").textContent = String(progress.xp || 0);
}

function getSectionDayPlan(phase) {
  const generatedConcepts = profile?.curriculum?.phases?.flatMap((item) => item.concepts) || [];
  const dailyMinutes = Math.max(5, Number(profile?.minutes) || 10);
  let nextDay = 1;
  const lessons = Array.from({ length: phase.end - phase.start }, (_, relativeIndex) => {
    const conceptIndex = phase.start + relativeIndex;
    const estimatedMinutes = Math.max(3, Number(generatedConcepts[conceptIndex]?.durationMinutes) || 8);
    const days = Math.max(1, Math.ceil(estimatedMinutes / dailyMinutes));
    const lesson = { conceptIndex, estimatedMinutes, startDay: nextDay, endDay: nextDay + days - 1 };
    nextDay += days;
    return lesson;
  });
  return { dailyMinutes, days: nextDay - 1, lessons };
}

function renderRoadmap() {
  const container = document.querySelector("#phase-list");
  container.replaceChildren();
  const concepts = getConcepts();
  const coursePhases = getPhases();
  const activePhase = coursePhases.findIndex((phase) => progress.currentConcept >= phase.start && progress.currentConcept < phase.end);
  coursePhases.forEach((phase, phaseIndex) => {
    const masteredInPhase = progress.masteredConcepts.filter((concept) => concept >= phase.start && concept < phase.end).length;
    const isCurrent = phaseIndex === activePhase;
    const isComplete = masteredInPhase === phase.end - phase.start;
    const card = document.createElement("section");
    card.className = `phase-card${isCurrent ? " is-current" : ""}`;
    const heading = document.createElement("div");
    heading.className = "phase-heading";
    const number = document.createElement("span");
    number.className = "phase-number";
    number.textContent = String(phaseIndex + 1).padStart(2, "0");
    const copy = document.createElement("div");
    copy.className = "phase-heading-copy";
    const title = document.createElement("h2");
    title.textContent = `Section ${phaseIndex + 1}: ${phase.title.replace(/^Phase\s+\d+\s*:\s*/i, "")}`;
    const subtitle = document.createElement("p");
    subtitle.textContent = phase.subtitle;
    copy.append(title, subtitle);
    const status = document.createElement("span");
    status.className = "phase-status";
    status.textContent = isComplete ? "COMPLETED" : isCurrent ? `${masteredInPhase}/${phase.end - phase.start} IN PROGRESS` : "COMING NEXT";
    heading.append(number, copy, status);
    const dayPlan = getSectionDayPlan(phase);
    const schedule = document.createElement("div");
    schedule.className = "phase-schedule";
    schedule.innerHTML = `<span aria-hidden="true">◷</span> Recommended ${dayPlan.days} study ${dayPlan.days === 1 ? "day" : "days"} <span class="schedule-separator">·</span> ${dayPlan.dailyMinutes} min/day`;
    const list = document.createElement("div");
    list.className = "concept-list";

    concepts.slice(phase.start, phase.end).forEach((concept, relativeIndex) => {
      const conceptIndex = phase.start + relativeIndex;
      const mastered = progress.masteredConcepts.includes(conceptIndex);
      const unlocked = conceptIndex === 0 || progress.masteredConcepts.includes(conceptIndex - 1);
      const isCurrent = conceptIndex === progress.currentConcept;
      const row = document.createElement("div");
      row.className = `concept-row${mastered ? " is-mastered" : unlocked ? " is-unlocked" : " is-locked"}${isCurrent ? " is-active" : ""}`;
      row.dataset.conceptIndex = String(conceptIndex);
      row.setAttribute("role", unlocked ? "button" : "listitem");
      row.tabIndex = unlocked ? 0 : -1;
      const indicator = document.createElement("span");
      indicator.className = "concept-indicator";
      indicator.textContent = mastered ? "✓" : isCurrent ? "▶" : unlocked ? "•" : "⌑";
      const name = document.createElement("strong");
      name.textContent = concept;
      const lessonDay = dayPlan.lessons[relativeIndex];
      const dayLabel = document.createElement("span");
      dayLabel.className = "concept-day";
      dayLabel.textContent = lessonDay.startDay === lessonDay.endDay
        ? `DAY ${lessonDay.startDay}`
        : `DAYS ${lessonDay.startDay}–${lessonDay.endDay}`;
      const label = document.createElement("small");
      label.className = "concept-state";
      label.textContent = mastered ? "Mastered" : isCurrent ? "Continue" : unlocked ? "Ready" : "Locked";
      row.append(indicator, name, dayLabel, label);
      list.append(row);
    });

    card.append(heading, schedule, list);
    container.append(card);
  });
}

function openConcept(index) {
  const conceptIndex = Number(index);
  if (!Number.isInteger(conceptIndex) || conceptIndex < 0 || conceptIndex >= getConcepts().length) return;
  if (conceptIndex > 0 && !progress.masteredConcepts.includes(conceptIndex - 1)) return;
  progress.currentConcept = conceptIndex;
  progress.mastery = Number(progress.masteryByConcept?.[conceptIndex]) || 0;
  progress.phase = progress.masteredConcepts.includes(conceptIndex) ? "complete" : "reflection";
  saveProgress();
  lessonHistory = [];
  elements.chat.replaceChildren();
  elements.answer.disabled = false;
  elements.send.disabled = false;
  renderLessonDetails();
  renderProgress();
  showView("lesson");
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    showView(button.dataset.view);
  });
});

document.querySelector("#lesson-next").addEventListener("click", () => {
  const nextIndex = getCurrentConcept().index + 1;
  if (nextIndex < getConcepts().length) {
    openConcept(nextIndex);
    return;
  }
  showView("roadmap");
  showToast("Path complete! You finished every lesson in this learning path.");
});

elements.send.addEventListener("click", handleAnswer);
elements.answer.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleAnswer();
  }
});

document.querySelector(".tiny-add").addEventListener("click", () => {
  // Starting a skill is what spends the free monthly allowance, so the two ways it can be refused
  // are handled before the learner spends five onboarding steps on a path they cannot get.
  if (accountConfigured && !accountUser) {
    showToast("Sign in free to start a new skill - it is counted on your account, not this browser.");
    openAccountDialog();
    return;
  }
  if (skillsLeft === 0) {
    openPlansDialog("You have used this month's free skill. Pro unlocks unlimited skills, and you keep studying the one you started.");
    return;
  }
  openOnboarding();
});
document.querySelector(".notification-button").addEventListener("click", () => {
  showToast("You’re all caught up. Come back anytime to keep learning.");
});
document.querySelector(".profile-button").addEventListener("click", openAccountDialog);
document.querySelector("#account-open").addEventListener("click", openAccountDialog);

const backendDialog = document.querySelector("#backend-dialog");
const backendUrlInput = document.querySelector("#backend-url");
const backendMessage = document.querySelector("#backend-message");
const openBackendSettings = () => {
  backendUrlInput.value = localStorage.getItem(API_BASE_URL_KEY) || "";
  backendMessage.textContent = "";
  backendDialog.showModal();
};
document.querySelector("#backend-config-open").addEventListener("click", openBackendSettings);
document.querySelector("#backend-config-onboarding").addEventListener("click", openBackendSettings);
document.querySelector("#backend-close").addEventListener("click", () => backendDialog.close());
backendDialog.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) backendDialog.close();
});
document.querySelector("#backend-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const rawUrl = backendUrlInput.value.trim();
  if (!rawUrl) {
    localStorage.removeItem(API_BASE_URL_KEY);
  } else {
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      backendMessage.textContent = "Enter a valid server URL, such as https://your-orbit-server.example.";
      return;
    }
    const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
    if ((url.protocol !== "https:" && !isLocalHttp) || url.username || url.password || url.search || url.hash) {
      backendMessage.textContent = "Use an HTTPS backend URL. Only localhost may use HTTP for desktop testing.";
      return;
    }
    localStorage.setItem(API_BASE_URL_KEY, url.origin);
  }
  accountUser = null;
  cloudSyncReady = false;
  backendDialog.close();
  pointLegalLinksAtBackend();
  await updateAIStatus();
  await initializeAccount();
  if (!apiReady) showToast("Server URL saved. Check that the backend is online and allows the Orbit app origin.");
});
document.querySelector("#backend-clear").addEventListener("click", async () => {
  localStorage.removeItem(API_BASE_URL_KEY);
  backendUrlInput.value = "";
  accountUser = null;
  cloudSyncReady = false;
  backendDialog.close();
  await updateAIStatus();
});

document.querySelector("#account-close").addEventListener("click", () => {
  document.querySelector("#account-dialog").close();
});
document.querySelector("#account-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
document.querySelector("#account-google").addEventListener("click", startGoogleSignIn);
document.querySelector("#plans-close").addEventListener("click", () => {
  document.querySelector("#plans-dialog").close();
});
document.querySelector("#plans-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
document.querySelector("#account-upgrade").addEventListener("click", () => {
  document.querySelector("#account-dialog").close();
  openPlansDialog();
});
document.querySelectorAll("[data-account-mode]").forEach((button) => {
  button.addEventListener("click", () => setAccountMode(button.dataset.accountMode));
});
document.querySelector("#account-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.querySelector("#account-submit");
  const message = document.querySelector("#account-message");
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  button.disabled = true;
  message.textContent = accountMode === "signup" ? "Creating your account…" : "Signing in…";
  try {
    const result = await apiRequest(`/api/auth/${accountMode}`, { email, password });
    form.elements.password.value = "";
    if (result.requiresEmailConfirmation) {
      message.textContent = "Check your email to confirm your account, then sign in here.";
      setAccountMode("login");
      message.textContent = "Check your email to confirm your account, then sign in here.";
      return;
    }
    accountUser = result.user;
    renderAccountPanel();
    await syncAccountState();
    await updateAIStatus();
    document.querySelector("#account-dialog").close();
    showToast("Signed in. Your learning progress is syncing.");
  } catch (error) {
    message.textContent = error.message;
    renderAccountPanel();
  } finally {
    button.disabled = false;
  }
});
document.querySelector("#account-signout").addEventListener("click", async () => {
  const button = document.querySelector("#account-signout");
  const message = document.querySelector("#account-message");
  button.disabled = true;
  message.textContent = "Signing out…";
  try {
    await apiRequest("/api/auth/logout", {}, "POST");
    accountUser = null;
    await updateAIStatus();
    cloudSyncReady = false;
    renderAccountPanel();
    message.textContent = "You are signed out. Your learning stays saved on this device.";
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#edit-plan").addEventListener("click", openOnboarding);
document.querySelector("#phase-list").addEventListener("click", (event) => {
  const row = event.target.closest("[data-concept-index]");
  if (row && row.getAttribute("role") === "button") openConcept(row.dataset.conceptIndex);
});
document.querySelector("#phase-list").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest("[data-concept-index]");
  if (row && row.getAttribute("role") === "button") {
    event.preventDefault();
    openConcept(row.dataset.conceptIndex);
  }
});
document.querySelector("#onboarding-back").addEventListener("click", () => {
  if (onboardingStep > 0) {
    onboardingStep -= 1;
    renderOnboarding();
  }
});
elements.onboarding.addEventListener("click", (event) => {
  const option = event.target.closest("[data-choice-group]");
  if (option) {
    const group = option.dataset.choiceGroup;
    onboardingState[group] = group === "minutes" || group === "quizAnswer"
      ? Number(option.dataset.choice)
      : option.dataset.choice;
    if (group === "skill") {
      onboardingState.level = "";
      onboardingState.quizAnswer = -1;
      onboardingState.goal = "";
      onboardingState.customGoal = "";
      onboardingState.placementNotes = "";
      generatedRoadmap = null;
      roadmapError = "";
      document.querySelector("#onboarding-continue").disabled = !canContinue();
    }
    if (group !== "skill") {
      generatedRoadmap = null;
      roadmapError = "";
    }
    renderOnboarding();
    return;
  }
  if (event.target.closest("#onboarding-continue")) {
    if (!canContinue()) return;
    if (onboardingStep === 5) {
      completeOnboarding();
      return;
    }
    onboardingStep += 1;
    renderOnboarding();
    return;
  }
  if (event.target.closest("#onboarding-change")) {
    onboardingStep = 0;
    renderOnboarding();
    return;
  }
  if (event.target.closest("#roadmap-retry")) {
    roadmapError = "";
    renderOnboarding();
  }
});
elements.onboarding.addEventListener("input", (event) => {
  if (event.target.id === "custom-skill") {
    onboardingState.customSkill = event.target.value;
    generatedRoadmap = null;
    roadmapError = "";
    document.querySelector("#onboarding-continue").disabled = !canContinue();
  } else if (event.target.id === "placement-notes") {
    onboardingState.placementNotes = event.target.value;
    generatedRoadmap = null;
    roadmapError = "";
    document.querySelector("#onboarding-continue").disabled = !canContinue();
  } else if (event.target.id === "custom-goal") {
    onboardingState.customGoal = event.target.value;
    generatedRoadmap = null;
    roadmapError = "";
  } else if (event.target.id === "learner-name") {
    onboardingState.name = event.target.value;
  }
});

document.querySelector("#onboarding-cancel").addEventListener("click", () => {
  if (!profile) return;
  elements.onboarding.hidden = true;
  document.querySelector(".app-shell").hidden = false;
});

renderCourseDetails();
renderProgress();
renderRoadmap();
pointLegalLinksAtBackend();
if (!profile) openOnboarding();
renderAccountPanel();
updateAIStatus().then(initializeAccount);
