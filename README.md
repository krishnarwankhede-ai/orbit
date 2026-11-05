# Orbit — an AI tutor that plans the path, then teaches it

**Live site:** <https://orbit-gs0d.onrender.com> · India · first 30 days of Pro free · ₹399 / 30 days, ₹2,999 / 365 days

Orbit is a complete, running AI learning platform, not a demo. A learner says what they want to learn, how much they already know and how many minutes a day they have. Orbit's AI writes a personalised roadmap of about 40 lessons in 8 sections, then teaches it one concept at a time in a chat: explains, sets a challenge, grades the answer, scaffolds the mistake, rephrases the doubt, and only unlocks the next concept after three correct checkpoints and 80% mastery. The same tutor answers questions mid-lesson instead of going quiet.

Everything is server-decided and real: the tier, the daily AI budget, the monthly skill allowance, the payment amount and the plan activation. Nothing about money or quota is mocked, and no API key ever reaches the browser.

| | Free | Pro |
| --- | --- | --- |
| New skills per calendar month | 1 | unlimited |
| Skills already started | kept for life, switchable in the sidebar | kept for life |
| Tutor replies per day | 15 | 120 |
| Roadmap generations per day | 2 | 20 |
| Model | `deepseek/deepseek-v4-flash` | the same model — plans differ in volume, not in teaching quality |

## How a session actually goes

1. **Onboarding** — skill, self-rated level, goal, daily minutes, then one tiny placement question. The AI answers shape the path, not a fixed template.
2. **Roadmap** — the server asks the model for the whole curriculum in one call and *repairs* the near-misses (41 lessons with a repeated title, a phase holding four) instead of failing the learner after a 35-second wait. A path under 30 lessons is re-asked once.
3. **Lesson rail** — Learn → Practice → Mastery Check, with the recommended study day from the learner's own daily minutes.
4. **Tutor** — the exercise format follows the skill: multiple choice, fill-the-blank, word-bank building, or a practical scenario. A line ending in `?` is treated as a doubt and is never graded or counted.
5. **Progress** — per-skill mastery, XP and streak, kept for every skill in the library and synced to the learner's account.

## Why the engineering is worth a look

- **Zero dependencies.** A hand-written Node `http` server, one vanilla-JS client, no framework, no build step, no bundler — `npm start` and it runs. `server.js` also serves the five public legal pages from the same process.
- **Measured economics, not guesses.** One 40-lesson roadmap costs ₹0.006–0.01 and about 2,200 output tokens; one taught topic runs ₹0.06–0.38. A learner's whole month lands around ₹2–12, which is why the free tier is a *volume* limit rather than a worse model.
- **Budget that cannot be gamed.** A reply that fails at the provider or comes back malformed is not charged to the learner. The tier comes from the account on the server, so editing a request cannot buy the paid model.
- **A monthly cap that survives a restart.** `learner_skill` in Postgres answers two different questions at once — names ever started, and names first started this month — so reopening Python in December never spends December's free skill, and a cleared browser cannot farm allowances.
- **Multi-skill by design.** Every started skill lives in `orbit-skill-library-v1` and syncs as one v2 payload; applying cloud state *merges*, so a stale single-skill row can never delete a skill the learner holds locally.
- **Fail-open where it matters.** If Supabase is unreachable the skill gate opens and logs, because an outage should not stop someone from studying. If the first AI provider is out of quota, the same request retries on the next provider.
- **Four offline test suites** (`npm run check`) cover the provider chain, forged Razorpay signatures, Google PKCE and cookie sessions, and the legal pages — without calling a single paid API, so verifying costs nothing.
- **Discoverable without a framework.** `robots.txt`, `sitemap.xml` and an SVG favicon are answered by the same hand-written server, and the page's Open Graph tags and JSON-LD (`Organization`, `WebSite`, `SoftwareApplication`, `FAQPage`) are generated at request time from `billingPlans` and the live daily/monthly limit helpers — so a search result can never quote a price or an allowance the checkout and the gate disagree with.

## Repository map

| File | Role |
| --- | --- |
| `server.js` | HTTP server, AI provider chain and fallbacks, tiers, skill gate, Supabase state + auth, Razorpay verify/webhook, legal pages |
| `app.js` / `index.html` / `styles.css` | the entire client — onboarding, roadmap rendering, lesson rail, tutor chat, skill library, cloud sync |
| `legal/*.html` | `/pricing` `/privacy` `/terms` `/refund-policy` `/contact`, filled from the same server values the checkout enforces |
| `supabase.sql` | `learner_state`, `learner_plan` and `learner_skill` with row-level security on |
| `scripts/check-*.js` | the four offline suites |
| `render.yaml` | one-click deploy of the app + backend as a single service |
| `android/` | optional Capacitor shell that packages the same web files |

The rest of this document is the operator's guide: connecting a provider, deploying, taking payment, and passing a payment gateway's website review.

## Requirements

- Node.js 20 or newer
- An API key for at least one AI provider: OpenRouter, Google AI Studio (Gemini), OpenAI, or Anthropic
- Internet access when generating a roadmap or chatting with the tutor

Node.js is installed on the development computer. If your existing VS Code terminal does not recognize `node` or `npm` yet, restart VS Code so it picks up the updated Windows PATH.

## Build an Android APK

Orbit includes a Capacitor Android shell. It packages only the app's HTML, CSS, and JavaScript; `.env`, AI provider credentials, and the Node server are not copied into the APK.

1. Install Node.js 20+, Java 21, and the Android SDK (including Android platform/build tools).
2. From PowerShell in this folder, run:

   ```powershell
   npm install
   npm run mobile:apk
   ```

3. Install `android\app\build\outputs\apk\debug\app-debug.apk` on an Android phone. This is a debug APK for direct testing, not a Play Store release.
4. The APK works as an offline UI shell. To use AI later, tap **Connect server** (or the gear icon) and enter the HTTPS base URL of a trusted, hosted Orbit backend. The URL is saved on the device; API keys must stay on the backend. The backend must explicitly allow the app origin `https://localhost` and its own hostname through `ORBIT_ALLOWED_ORIGINS` and `ORBIT_ALLOWED_HOSTS`.

The APK has its own local browser storage, separate from desktop progress. `npm run mobile:sync` refreshes its packaged web files before the next build. The mobile bundle contains only `index.html`, `app.js`, `styles.css`, and Capacitor's runtime bridge.

## Host the backend for the APK

The APK needs a reachable HTTPS backend for the AI provider and Supabase. Never put an AI provider key, Supabase service-role key, or other server secrets in the APK or commit them to source control.

1. Push this project to a private GitHub repository. Confirm `.env` is not present in the repository; `.gitignore` excludes it. Do not upload `.env` or paste secrets into chat.
2. In Render, choose **New → Blueprint**, connect that repository, and deploy using the included `render.yaml`.
3. Enter `OPENROUTER_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` into Render's prompted secret fields, plus `AI_API_KEY`, `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` if you want hosted backups. Add your own address to `PAID_EMAILS` to test the paid learner tier. Use provider keys and a Supabase publishable/anon key only—never a Supabase `service_role` or secret key. Keep Supabase Row Level Security enabled and run `supabase.sql`.
4. After deployment, open the Render service's HTTPS URL and check `/api/status`. Configure the Supabase Auth Site URL and allowed redirect URLs for that public HTTPS origin before testing account sign-in.
5. On the phone, install the debug APK, tap **Connect server**, and enter the Render HTTPS base URL. This saves only the URL on the device.

Render's free service may sleep when idle and cold-start on the next request. Provider quota and billing limits still apply: a Gemini free-tier API key runs out after a few dozen requests a day, which is what makes Orbit fall back to the next provider — it is unrelated to the free/paid learner tier. Set the per-learner daily budgets on the server so a hosted app cannot spend past what you intended. The AI endpoints also use an in-memory request limit; this prototype is for personal testing, not a public multi-user launch. Set provider-side API restrictions and spending/quota alerts before sharing the backend URL.

## Connect an AI provider

Orbit works with OpenRouter, Gemini, OpenAI, or Anthropic. Add a key for any one of them; add more and Orbit uses them as backups.

1. Create a key with the provider you want: [openrouter.ai](https://openrouter.ai/settings/keys) for OpenRouter, [Google AI Studio](https://aistudio.google.com/apikey) for Gemini, [platform.openai.com](https://platform.openai.com/api-keys) for OpenAI, or [console.anthropic.com](https://console.anthropic.com/settings/keys) for Anthropic.
2. Open a PowerShell terminal in this folder and run `.\setup-ai.ps1`. It asks for the provider, the model, and the key; the key is typed into a hidden prompt. The script updates the local, Git-ignored `.env` file and keeps your other settings. If Windows blocks the script, run `powershell -ExecutionPolicy Bypass -File .\setup-ai.ps1`.
3. Or edit `.env` yourself (see `.env.example`):

   | Setting | Used for |
   | --- | --- |
   | `AI_PROVIDER` | Which provider is tried first: `openrouter`, `gemini`, `openai`, or `anthropic` |
   | `OPENROUTER_API_KEY` | OpenRouter key — one account, every model behind it |
   | `OPENROUTER_FREE_MODEL` / `OPENROUTER_PAID_MODEL` | Model per tier. Both default to `deepseek/deepseek-v4-flash` — the plans differ in daily requests, not in teaching quality |
   | `AI_API_KEY` or `GEMINI_API_KEY` | Gemini key |
   | `AI_MODEL` | Gemini model, for example `gemini-3.5-flash` |
   | `OPENAI_API_KEY` + `OPENAI_MODEL` | OpenAI key and model, for example `gpt-4o-mini` |
   | `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` | Anthropic key and model, for example `claude-sonnet-4-5` |
   | `<PREFIX>_MODEL` | Pins one provider's model for both tiers, overriding the per-tier variables |
   | `AI_FALLBACK_PROVIDERS` | Optional order such as `gemini,openai,anthropic`. Leave it unset and every provider with a key becomes a backup. |

   OpenRouter is the quickest way to run both tiers from a single key and a single invoice. `<PREFIX>_MODEL` is how you pin a fixed model on any provider; `AI_MODEL` is the older name for the Gemini model and is never sent elsewhere.

4. Start or restart the app:

   ```powershell
   npm start
   ```

   The startup log lists the providers and models it resolved, the free and paid tier models, and `/api/status` reports the same chain plus your tier.

5. Open `http://127.0.0.1:3000` in your browser. The AI status indicator shows which provider is ready; hover it to see the plan, model, and provider list.

When the first provider is out of daily quota (Gemini's free tier caps at a few dozen requests per day), rate-limited, or temporarily unavailable, Orbit automatically retries the same lesson or roadmap request on the next configured provider and only reports an error if every provider fails. The server keeps a per-provider check in `scripts/check-ai.js`, run by `npm run check`, so a request-shape mistake cannot silently ship.

Locally, the backend binds to `127.0.0.1` by default. Hosted deployments set `HOST=0.0.0.0`, and the Render blueprint restricts API host/origin checks to its service and the Capacitor app origins. The browser never receives an AI API key. `.env` is ignored by Git.

## Free and paid learner tiers

The tier is decided on the server and never read from the app, so a learner cannot request the paid model by editing a request.

| Setting | Used for |
| --- | --- |
| `PAID_EMAILS` | Comma-separated account emails on the paid plan; everyone else is free |
| `ORBIT_FORCE_TIER` | `free` or `paid` — forces one plan for every learner while testing, overriding `PAID_EMAILS`; each learner still spends their own allowance |
| `FREE_DAILY_TUTOR_CALLS` | Tutor replies per learner per day, default 15 (one topic costs 6-11 calls, so about two small topics) |
| `FREE_DAILY_ROADMAPS` | Roadmap generations per learner per day, default 2 |
| `PAID_DAILY_TUTOR_CALLS` / `PAID_DAILY_ROADMAPS` | Same guard on the paid plan, defaults 120 and 20 — about thirteen topics a day, which keeps one learner's worst month near ₹177 against ₹399 of fees, and stops a runaway client from spending without limit |
| `FREE_MONTHLY_SKILLS` | New skills a free learner may start per calendar month, default 1. Set `PAID_MONTHLY_SKILLS` to cap Pro too; leaving it unset means unlimited |

Identification is `user:<supabase id>` when signed in, then `device:<device id>` from the app, then the request IP. A signed-in account is paid when it owns an active row in `learner_plan` (set by a real payment) or when its email is listed in `PAID_EMAILS`; everyone else is free. Going over a cap returns `AI_BUDGET_EXCEEDED` with an upgrade message, and the app opens the plans window. `/api/status` reports the resolved tier, plan, model, daily limits, the monthly skill cap and how many skills the signed-in account has started this month.

The monthly skill allowance is a second gate on `POST /api/roadmap`, counted in the `learner_skill` table rather than in server memory — a restart or a cleared browser must not mint a fresh month. Starting a skill therefore needs a signed-in account (`ACCOUNT_REQUIRED` for a signed-out browser), rebuilding a skill already started costs nothing, and a second new name returns `SKILL_LIMIT_REACHED`. If Supabase is unreachable the gate opens and logs, because an outage should not stop someone from studying.

One read of `learner_skill` answers two different questions, because they have different answers: `ever` (every name this account has started, in any month) and `thisMonth` (the names first started now). Reopening an old skill is always allowed and records no row, so switching back to Python in December cannot spend December's free skill. The count shown by `/api/status` and the app pill is `thisMonth`, i.e. only genuinely new skills.

A learner keeps every skill they start. The library lives in `orbit-skill-library-v1` as `{ activeId, skills: [plan] }`, one plan per skill, and a browser holding only the older single-plan `orbit-learner-profile-v1` blob is imported as the library's first entry on load. Progress was always per skill (`orbit-progress-<skill>-v1`), so no progress is moved or renamed; `<skill>` for a custom skill is its lowercased name URI-encoded, which is what `skillIdentity()` produces and what the gate compares. `completeOnboarding()` upserts by that identity, so starting another skill can update a same-named plan but never removes a different one, and choosing the sidebar's `+` opens a blank onboarding instead of pre-filling the skill on screen. Sync sends the whole library (`profile: { version: 2, activeId, skills }`, `progress: { version: 2, bySkill }`, one entry per skill, still the same two `learner_state` jsonb columns) and applying it merges: a skill only in the cloud is added, a skill present on both keeps the local copy unless the cloud plan's `updatedAt` is newer. The state route therefore has its own 512 KB body limit, since a generated path is around 15 KB and a Pro learner can hold many.

A learner only spends budget on a reply they actually received: a request that fails at the provider, or returns a malformed lesson, is not charged.

A roadmap is 40 lessons of JSON in one answer, which takes the model about 35 seconds and 2,200 output tokens (measured), so it gets its own 120-second timeout while a tutor reply keeps 30, and the browser waits 200 seconds so it never gives up before the server does. Ask for more lessons or longer text and the answer stops fitting the 10,000-token budget: the JSON arrives cut off, `finish_reason` is `length`, and the learner gets an error instead of a path.

Measured answers also over-shoot - 41 lessons with a repeated title, a phase holding four - so `validateRoadmap` repairs the shape instead of refusing it: a phase over eight lessons is cut, and lessons that repeat an earlier title or arrive without an objective or exercise are dropped. Only a path of under 30 lessons, or under five phases, is rejected, and then the AI is asked once more with the counts spelled out - unless the first answer already took over 70 seconds, because a learner should not wait three minutes. Every rejection logs what it counted (`[orbit] rejected roadmap: path too short: phases=3 lessons=12 dropped=8`); before that, Render's logs had nothing to say and the learner saw only "could not build a learning path".

## Take payment with Razorpay

Pro plans are bought inside the app and paid to your own Razorpay account. The browser never sees a secret.

1. In the [Razorpay dashboard](https://dashboard.razorpay.com/app/keys), copy the **test** key id and secret. Test cards charge nothing, so you can verify the whole flow before any KYC.
2. Add them to `.env` as `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, then run `supabase.sql` again so the `learner_plan` table exists, and restart Orbit.
3. In the app, open the account window → **Upgrade to Pro**. The plans window shows ₹399 / 30 days and ₹2,999 / 365 days. Prices come from `billingPlans` in `server.js`; the client only sends a plan id, so editing the request cannot change the amount.
4. Razorpay's window returns a payment id and signature. `POST /api/billing/verify` recomputes the HMAC-SHA256 with your key secret, then re-reads the order and payment from Razorpay's API to confirm the order belongs to that account and the money is `captured`. Only then is the plan written and the cache dropped, so the very next AI request runs on the paid model.
5. For production, add a Razorpay webhook pointing at `https://your-server/api/billing/webhook` with a signing secret in `RAZORPAY_WEBHOOK_SECRET`, plus `SUPABASE_SERVICE_ROLE_KEY` if you want the webhook to activate plans without the learner's browser. A webhook cannot reach `localhost`, so locally step 4 is what activates the plan.

`scripts/check-billing.js` (run by `npm run check`) exercises all of this offline against a stubbed Razorpay and Supabase: forged signatures grant nothing, prices are the server's, an expired plan drops the learner back to free, and the webhook path is signature-checked.

Monthly and yearly are single payments that unlock 30 or 365 days, then fall back to free until the learner buys again. Automatic renewal needs a Razorpay Subscription plan, which is not wired up yet.

## Go live: publish Orbit and pass Razorpay's website check

Live keys (the ones that move real money) need Razorpay to approve your business, and their reviewer opens your website. `http://127.0.0.1:3000` and ngrok-style tunnels are never approved, so Orbit has to be on a public HTTPS address first.

### 1. Deploy on Render

Follow **Host the backend for the APK** above — the same deployment serves the app and the policy pages. Two additions matter for payments:

1. When Render prompts for the `sync: false` values, also fill in the business details listed in step 2 below, not only the AI and Supabase keys.
2. Open `https://your-service.onrender.com/api/status` after the first deploy and confirm it answers with JSON, and `https://your-service.onrender.com/pricing` and confirm it renders as a page.

`HOST=0.0.0.0`, `NODE_ENV=production` and `RENDER_EXTERNAL_HOSTNAME` are already set by `render.yaml`, so the API host and origin allowlists accept the deployed domain without any extra configuration.

### 2. Publish the pages the reviewer reads

Five public pages are served by `server.js` from the `legal/` folder and need no account: `/pricing`, `/privacy`, `/terms`, `/refund-policy`, `/contact`. They are linked from the sidebar, the first-run screen and the plans window.

Fill in the business identity, otherwise every page prints a **Not ready to publish** warning instead of fake details:

```env
ORBIT_BUSINESS_NAME=Your registered firm name
ORBIT_SUPPORT_EMAIL=help@your-domain.in
ORBIT_SUPPORT_PHONE=+91 98765 43210
ORBIT_BUSINESS_ADDRESS=Registered address, including PIN
```

`ORBIT_GRIEVANCE_EMAIL` falls back to the support address, `ORBIT_SITE_URL` falls back to `https://RENDER_EXTERNAL_HOSTNAME`, and `ORBIT_LEGAL_DATE` sets the "Last updated" line. The plan table on `/pricing` is generated from `billingPlans`, so the page can never quote a price different from what checkout charges, and the daily limits come from the same `FREE_DAILY_*` / `PAID_DAILY_*` values the server enforces.

`scripts/check-legal.js` (in `npm run check`) proves all five pages serve, cross-link, contain no unfilled `{{placeholder}}`, quote the real prices, and show the publish warning when the business details are missing.

Edit the wording in `legal/*.html` to match your business, and have a lawyer read the refund and liability terms before you charge anyone — they describe *this* product honestly (one-time payments, no auto-renewal, 7-day refund window), which is exactly what a reviewer checks for consistency.

### 3. Submit the Razorpay verification form

In **Account & Settings → Business Verification** ("Submit details for verification"):

| Field | What to enter |
| --- | --- |
| Where do you want to accept payments? | **Website** (add the Android app later under **App**) |
| Add your website link | `https://your-service.onrender.com` — the deployed URL, reachable without a VPN |
| Does your website require users to login to complete a payment? | **Yes.** `/api/billing/checkout` answers `401 AUTH_REQUIRED` for a signed-out browser, so this is the truth |
| Add test account username/email | A throwaway Orbit account you create for the review: email and password. Not your own account — a reviewer will sign in with it |

Then the document part: PAN of the proprietor or company, bank account proof (cancelled cheque or statement) whose name matches, registered mobile and email, and the business category. Approval normally takes 1–3 working days. Once it is granted, generate **live** keys and replace `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in Render, add `RAZORPAY_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`, and point a webhook at `https://your-service.onrender.com/api/billing/webhook` for `payment.captured` and `payment.failed`.

Keep using test keys while the review runs — the app does not care which mode a key is in.

## Set up accounts and cloud progress

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In the project dashboard, copy the project URL and the publishable/anon key. Do not use or share the `service_role` secret.
3. Open Supabase **SQL Editor**, paste the contents of `supabase.sql`, and run it. This creates a per-user learning-state table protected by row-level security.
4. In **Authentication → URL Configuration**, set the local Site URL to `http://127.0.0.1:3000` for email-confirmation testing.
5. Add these settings to the existing, Git-ignored `.env` file:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

6. Restart Orbit and refresh the browser. Select the account icon in the top bar to create an account or sign in. If email confirmation is enabled, confirm the message Supabase sends before signing in.

The app keeps Supabase credentials on the server and uses HTTP-only session cookies. The database policy restricts each account to its own learning state. Local browser progress is kept when signed out; on first sign-in, existing local progress is uploaded if the account has no saved state. An existing cloud state takes precedence when signing in.

### Sign in with Google

Orbit's account window offers **Continue with Google**, which runs Supabase's OAuth 2.0 + PKCE flow: the browser makes up a `code_verifier`, keeps it in `sessionStorage`, sends only its SHA-256 hash to `/api/auth/oauth/start`, and hands the verifier to `/api/auth/oauth/complete` when Supabase redirects back with a code. The server exchanges that code for a session and sets the same HTTP-only cookies the email flow uses, so a Google account gets cloud sync and paid plans with no extra step.

To turn it on:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an **OAuth client ID** for a Web application. Authorised redirect URI: `https://your-project.supabase.co/auth/v1/callback`.
2. In Supabase **Authentication → Provider → Google**, enable the provider and paste that client id and secret.
3. In Supabase **Authentication → URL Configuration**, set the Site URL and add every Orbit origin to **Redirect URLs** — `http://127.0.0.1:3000` for local testing and your `https://…` host for the deployed app.
4. Restart Orbit. The `redirect_to` Supabase returns to is built from the request's own host by `/api/auth/oauth/start`, so a learner cannot be bounced to a third-party site by editing the link.

Google sign-in completes in a normal browser. In the Capacitor APK the redirect leaves the WebView, so the mobile build keeps email sign-in until an in-app-browser OAuth flow is added.

Cloud data is stored in Supabase. For mobile or multi-device use, deploy the backend over HTTPS using the steps above; keep all AI provider, Razorpay and Supabase credentials in the hosting provider's secret environment settings.

## Current product scope

- Any skill can be entered in onboarding; there is no fixed five-skill limit.
- The AI provider generates a comprehensive roadmap with at least 8 sections and 40 distinct lessons, progressing from prerequisites and foundations through applied and advanced work to an independent capstone. Each lesson has an objective and exercise; sections show estimated study days based on the learner's daily time.
- The curriculum is personalized to the learner's starting level, placement notes, and goal. It is a structured path toward proficiency, not a promise that a fixed number of lessons guarantees mastery; learners must demonstrate understanding through practice.
- Older saved paths show an "Expand my learning path" action that generates the full curriculum directly, without re-entering onboarding. Regenerating a path preserves progress for lessons whose titles still match, along with overall learning history.
- Lessons move through Learn, Practice, and Mastery Check stages. A concept unlocks only after three correct checkpoints and at least 80% mastery; correct checkpoints earn XP, and mastered lessons unlock the next one.
- Tutor challenges adapt their exercise format to the skill: multiple-choice, fill-the-blank, word-bank building, or practical scenarios. Learners select an answer and check it, build word-bank answers from tiles, or explain in their own words.
- The roadmap is arranged into numbered sections with each lesson assigned a recommended study day. The suggested schedule is estimated from lesson duration and the daily minutes chosen during onboarding. The dashboard preview follows the learner's current section and reports the full course size.
- The lesson UI uses an original animated Orbit mascot and a step-by-step lesson rail, with answer feedback and XP celebrations. The visual treatment is inspired by friendly learning apps without reusing Duolingo characters or assets.
- The AI tutor responds to learner messages and adapts explanations and challenges to the learner's level, lesson stage, and attempts. It uses scaffolding after mistakes, varies examples, and reserves a fresh application challenge for mastery checks.
- Lessons include animated tutor-thinking feedback, checkpoint reactions, and XP celebrations. Motion respects the device's reduced-motion preference.
- Every skill a learner starts is kept. "Your skills" in the sidebar lists them as chips with their own mastery percentage, clicking another chip switches the whole app to it - path, lesson, tutor chat, streak and XP - and pressing `+` starts a new one beside them instead of replacing it.
- Without an account, lesson progress stays in this browser on this device. With Supabase configured, account holders sync every skill and its progress to the cloud, so signing in on another device restores the whole library and a stale cloud row cannot delete a skill held locally. Starting a new skill needs that signed-in account because the monthly allowance is counted on it.
- Free and paid plans teach with the same model and differ in volume: a free learner starts one new skill a month and gets the smaller daily budget, while a paid learner starts unlimited skills with the larger one. The paid plan comes from a real Razorpay payment recorded in `learner_plan`, or from `PAID_EMAILS` while you test. There is no automatic renewal; a plan is one payment for a fixed period.
- `/pricing`, `/privacy`, `/terms`, `/refund-policy` and `/contact` are public pages built for a payment-provider's business review, and their prices and limits are generated from the same server values the checkout enforces.
- Hosting is still yours to do: the app runs locally until you deploy it, and live Razorpay keys need the approval described in **Go live** above.
- AI output and mastery estimates need human review before treating them as authoritative. The app does not execute submitted code.
- Provider use may incur charges and is subject to Google's account limits and terms.

## Verify the app

```powershell
npm run check
```

Four offline suites run against stubbed providers — `check-ai.js` (provider chain, tiers, caps), `check-billing.js` (Razorpay signatures, server-side prices, plan grant, webhook), `check-auth.js` (Google PKCE and the session cookie) and `check-legal.js` (the five public pages). None of them calls a paid API, so verifying costs nothing.

## License

Orbit is the source-available portfolio of a solo-built, commercially running product: **all rights reserved**, no license to redistribute or sell it is granted. The code is published here so that anyone can read exactly how a real AI tutoring product handles tiers, budgets, payments and learner data — read it, learn from it, run your own copy for personal use by following the guide above, and open an issue if you spot a way it could be safer or cheaper for the learner who pays for it.

Provider keys, Supabase credentials and Razorpay secrets are read from a Git-ignored `.env` or the hosting provider's secret store; this repository has never contained one. The live deployment's business details (firm name, support email, address) are intentionally public on `/contact`, because Indian payment regulators require them to be.

