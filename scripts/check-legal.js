"use strict";

// Offline checks for the public policy pages Razorpay's reviewers open: /pricing, /privacy,
// /terms, /refund-policy, /contact. Nothing here calls out to the internet.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PORT = 3179;

process.env.PORT = String(PORT);
process.env.ORBIT_BUSINESS_NAME = "Orbit Learning Studio";
process.env.ORBIT_SUPPORT_EMAIL = "help@orbit-learning.test";
process.env.ORBIT_GRIEVANCE_EMAIL = "grievance@orbit-learning.test";
process.env.ORBIT_SUPPORT_PHONE = "+91 90000 00000";
process.env.ORBIT_BUSINESS_ADDRESS = "22 Sample Road, Pune 411001, India";
process.env.ORBIT_SITE_URL = "https://orbit-review.test";
process.env.ORBIT_LEGAL_DATE = "2 November 2026";

const { server, billingPlans, TRIAL_DAYS, GUIDE_PAGES } = require("../server.js");

const PAGES = ["/pricing", "/privacy", "/terms", "/refund-policy", "/contact"];
const GUIDES = [...GUIDE_PAGES.keys()];

async function getPage(pathname) {
  const response = await fetch(`http://127.0.0.1:${PORT}${pathname}`);
  return { status: response.status, type: response.headers.get("content-type") || "", body: await response.text() };
}

async function main() {
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
  try {
    const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
    for (const pathname of PAGES) {
      assert.ok(indexHtml.includes(`href="${pathname}"`), `${pathname} is reachable from the app itself`);
    }

    for (const pathname of PAGES) {
      const page = await getPage(pathname);
      assert.equal(page.status, 200, `${pathname} serves`);
      assert.ok(page.type.startsWith("text/html"), `${pathname} is a page, not JSON`);
      assert.ok(!page.body.includes("{{"), `${pathname} has no unfilled placeholder`);
      assert.ok(page.body.includes("Orbit Learning Studio"), `${pathname} shows the business name`);
      assert.ok(page.body.includes("help@orbit-learning.test"), `${pathname} shows a working contact address`);
      assert.ok(!page.body.includes("legal-warning"), `${pathname} is publishable when the details are set`);
      for (const other of PAGES) {
        if (other !== pathname) assert.ok(page.body.includes(`href="${other}"`), `${pathname} links to ${other}`);
      }
    }

    const pricing = await getPage("/pricing");
    for (const plan of Object.values(billingPlans)) {
      const shown = `₹${(plan.amountPaise / 100).toLocaleString("en-IN")}`;
      assert.ok(pricing.body.includes(shown), `the pricing page quotes the real ${shown} price`);
      assert.ok(pricing.body.includes(plan.label), `the pricing page names the ${plan.label} plan`);
    }
    assert.ok(pricing.body.includes("no automatic renewal"), "the pricing page is honest about renewal");
    assert.ok(pricing.body.includes("40"), "the free plan's daily tutor limit is published");
    assert.ok(pricing.body.includes(`${TRIAL_DAYS} days of Pro, free`), "the pricing page leads with the trial");
    assert.ok(pricing.body.includes("Is there a free trial?"), "the pricing page answers the trial question");
    assert.ok(pricing.body.includes("<td>Pro trial</td>"), "the plans table gives the trial its own row");
    assert.ok(
      pricing.body.indexOf("<td>Pro trial</td>") < pricing.body.indexOf("<td>Free</td>"),
      "the trial is the first plan in the table, ahead of Free"
    );
    assert.ok(
      pricing.body.includes(`for those ${TRIAL_DAYS} days you get exactly the Pro column`),
      "the trial is described as full Pro, not a smaller product"
    );

    const terms = await getPage("/terms");
    assert.ok(terms.body.includes("There is no automatic renewal"), "the terms state the real billing behaviour");
    assert.ok(terms.body.includes("Free trial."), "the terms grant the trial and bound it to one account");
    assert.ok(terms.body.includes("/refund-policy"), "the terms point at the refund policy");

    const home = await getPage("/");
    assert.ok(home.body.includes(`${TRIAL_DAYS} days of Pro free`), "the crawlable homepage promises the same trial the server grants");
    assert.ok(home.body.includes("free trial"), "the homepage structured data answers the trial question");
    const homeTitle = (home.body.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    assert.ok(/AI tutor/i.test(homeTitle), "the homepage title carries the words learners actually type, not a slogan");
    assert.ok(homeTitle.startsWith("Orbit"), "the title leads with the brand, so brand searches match the site");
    const homeDescription = (home.body.match(/name="description" content="([^"]*)"/) || [])[1] || "";
    assert.ok(homeDescription.includes(`${TRIAL_DAYS} days of Pro free`), "the search snippet under the title promises the real trial");

    const refund = await getPage("/refund-policy");
    for (const phrase of ["7 days", "5 working days", "original payment method", "Grievance redressal"]) {
      assert.ok(refund.body.includes(phrase), `the refund policy covers ${phrase}`);
    }

    const soldPlans = `${pricing.body}${terms.body}${refund.body}`;
    assert.ok(!soldPlans.includes("ifetime"), "no page still sells the retired lifetime plan");
    assert.ok(!soldPlans.includes("₹1,999"), "the retired ₹1,999 price is gone from every page");

    // The free guides are the pages Google can rank, so they are held to the same rules as the
    // policy pages: they serve, they carry the real limits, and they never leak a placeholder.
    const sitemapBody = await (await fetch(`http://127.0.0.1:${PORT}/sitemap.xml`)).text();
    const seenTitles = new Set();
    for (const route of GUIDES) {
      const guide = await getPage(route);
      assert.equal(guide.status, 200, `${route} serves without an account`);
      assert.ok(guide.type.startsWith("text/html"), `${route} is a page, not JSON`);
      assert.ok(!guide.body.includes("{{"), `${route} has no unfilled placeholder`);
      assert.ok(!guide.body.includes("Not ready to publish"), `${route} never shows the publish warning`);
      assert.ok(guide.body.includes("Orbit Learning Studio"), `${route} shows the business name`);
      assert.ok(guide.body.includes("help@orbit-learning.test"), `${route} shows a working contact`);
      assert.ok(guide.body.includes(`href="${route}"`), `${route} carries its own canonical link`);
      assert.ok(guide.body.includes(`href="/pricing"`), `${route} links to the pricing page`);
      assert.ok(guide.body.includes(String(TRIAL_DAYS)), `${route} quotes the real trial length`);
      assert.ok(guide.body.includes("<h1>"), `${route} has a headline`);
      assert.ok(guide.body.replace(/<[^>]*>/g, "").length > 3000, `${route} is a real answer, not a teaser`);
      assert.ok(!guide.body.includes("ifetime"), `${route} does not sell the retired lifetime plan`);
      const title = (guide.body.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
      assert.ok(title.startsWith("Orbit") === false, `${route} does not reuse the site title`);
      assert.ok(title.includes("— Orbit"), `${route} titles end with the brand`);
      assert.equal(seenTitles.has(title), false, `${route} has a title no other guide uses`);
      seenTitles.add(title);
      assert.ok(sitemapBody.includes(`https://orbit-review.test${route}`), `${route} is in the sitemap`);
      assert.ok(home.body.includes(`href="${route}"`), `${route} is linked from the homepage`);
      for (const other of GUIDES) {
        if (other !== route) assert.ok(guide.body.includes(`href="${other}"`), `${route} links to ${other}`);
      }
    }
    assert.ok(home.body.includes("Free guides"), "the homepage names the guides section");
    const hindiGuide = await getPage("/learn/coding-in-hindi");
    assert.ok(/[\u0900-\u097F]/.test(hindiGuide.body), "the Hindi guide carries real Devanagari, not only romanised text");
    const missingGuide = await getPage("/learn/no-such-guide");
    assert.equal(missingGuide.status, 404, "an unknown guide route is still a 404");

    const styles = await fetch(`http://127.0.0.1:${PORT}/styles.css`);
    assert.equal(styles.status, 200, "the shared stylesheet is still served");
    const css = await styles.text();
    assert.ok(css.includes(".legal-page"), "the legal pages have styling");

    const missing = await fetch(`http://127.0.0.1:${PORT}/nowhere`);
    assert.equal(missing.status, 404, "an unknown path is still a 404");

    process.env.ORBIT_SUPPORT_EMAIL = "";
    process.env.ORBIT_BUSINESS_NAME = "";
    const unpublished = await getPage("/contact");
    assert.equal(unpublished.status, 200, "the contact page still serves without business details");
    assert.ok(unpublished.body.includes("Not ready to publish"), "a missing business email is flagged instead of faked");
    assert.ok(unpublished.body.includes("ORBIT_SUPPORT_EMAIL"), "the flag names the variable to set");
    assert.ok(!unpublished.body.includes("{{"), "no placeholder leaks when the details are missing");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  console.log("Legal checks passed: five public pages, five free guides, real prices, cross-links, contact details and the publish guard.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
