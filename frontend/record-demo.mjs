// Records a captioned screencast of the live Agent Passport demo.
//   npm run preview   (in another shell, serves the built app on :4173)
//   node record-demo.mjs
// Produces ../docs/demo.webm
import { chromium } from "playwright";
import fs from "node:fs";

const W = 1366, H = 768;
const BASE = process.argv[2] || "http://localhost:4173/";

const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  recordVideo: { dir: "video-tmp", size: { width: W, height: H } },
});
const page = await context.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

// --- caption + card helpers (injected DOM, pointer-events:none) ---
async function setup() {
  await page.addStyleTag({
    content: `
    #cap{position:fixed;left:50%;bottom:42px;transform:translateX(-50%);max-width:920px;
      background:rgba(23,23,23,.94);color:#fff;font:500 19px/1.5 Inter,sans-serif;
      padding:14px 22px;border-radius:6px;opacity:0;transition:opacity .4s;z-index:2147483647;
      pointer-events:none;text-align:center;box-shadow:0 12px 40px -12px rgba(0,0,0,.5)}
    #cap b{color:#fdda24;font-weight:600}
    #card{position:fixed;inset:0;background:#0f0f0f;color:#fff;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:18px;z-index:2147483647;opacity:0;
      transition:opacity .5s;pointer-events:none;text-align:center}
    #card .t{font:800 52px/1.05 Inter,sans-serif;letter-spacing:-.03em}
    #card .s{font:400 20px/1.5 Inter,sans-serif;color:#bdbdbd;max-width:680px}
    #card .u{font:500 15px Inconsolata,monospace;color:#fdda24}
    #card .mk{width:64px;height:64px;border-radius:12px;background:#171717;display:grid;place-items:center;
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
    `,
  });
  await page.evaluate(() => {
    const cap = document.createElement("div"); cap.id = "cap"; document.body.appendChild(cap);
    const card = document.createElement("div"); card.id = "card";
    card.innerHTML = `<div class="mk"><svg width="40" height="40" viewBox="0 0 32 32" fill="none">
      <path d="M16 4 L25 7.5 V14 C25 19.5 21.4 23.3 16 25 C10.6 23.3 7 19.5 7 14 V7.5 Z" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M16 10C16.4 13.4 18.1 15.1 21.5 15.5C18.1 15.9 16.4 17.6 16 21C15.6 17.6 13.9 15.9 10.5 15.5C13.9 15.1 15.6 13.4 16 10Z" fill="#fdda24"/></svg></div>
      <div class="t" id="ct"></div><div class="s" id="cs"></div><div class="u" id="cu"></div>`;
    document.body.appendChild(card);
  });
}
// Stretch all dwell times so the screencast co-terminates with the ~122.5s
// ElevenLabs voiceover (same scene order → roughly tracks the narration).
const SCALE = Number(process.env.DEMO_SCALE || 1.226);
const sleep = (ms) => page.waitForTimeout(Math.round(ms * SCALE));
async function cap(html, ms = 0) {
  await page.evaluate((h) => { const c = document.getElementById("cap"); c.innerHTML = h; c.style.opacity = h ? "1" : "0"; }, html);
  if (ms) await sleep(ms);
}
async function card(t, s, u, ms) {
  await page.evaluate(({ t, s, u }) => {
    document.getElementById("ct").textContent = t;
    document.getElementById("cs").textContent = s;
    document.getElementById("cu").textContent = u || "";
    document.getElementById("card").style.opacity = "1";
  }, { t, s, u });
  await sleep(ms);
}
async function hideCard() { await page.evaluate(() => (document.getElementById("card").style.opacity = "0")); await sleep(600); }
const click = (re) => page.getByRole("button", { name: re }).first().click();

// ----------------------------------------------------------------- run
await page.goto(BASE, { waitUntil: "networkidle" });
await setup();

await card("Agent Passport", "Zero-knowledge credentials for autonomous AI-agent payments on Stellar", "", 5000);
await hideCard();

await cap("AI agents that pay today need your <b>keys</b> or your <b>KYC</b> — both leak money or identity.", 5000);
await cap("Agent Passport replaces that with a single <b>zero-knowledge proof</b>, verified on Stellar.", 4500);
await cap("It proves three things at once: <b>personhood</b>, <b>anti-Sybil</b>, and <b>solvency</b>.", 4000);

// Step 1 — mint
await page.locator("#demo").scrollIntoViewIfNeeded(); await sleep(700);
await cap("Pick a spend cap. The proof is built <b>in your browser</b> — key & balance never leave.", 4500);
await click(/Generate proof/i);
await sleep(5000);
await cap("A Groth16 proof appears: personhood · a nullifier · <b>balance ≥ cap</b> — all kept hidden.", 6500);

// Step 2 — verify
await cap("Now verify it <b>on-chain</b>: Soroban runs the BN254 pairing check, live on testnet.", 4500);
await click(/Verify on Stellar/i);
await sleep(8500);
await cap("Attestation minted on-chain — and notice <b>no wallet</b> was needed to verify.", 6000);

// Step 3 — pay gate
await cap("The <b>x402 gate</b>: a payment settles only within the proven, hidden cap.", 4500);
await click(/Pay \d+ XLM/i);
await sleep(5000);
await cap("Within the cap → <b>authorized</b>. Over the cap → <b>denied</b>. Balance never revealed.", 4000);
await page.getByRole("button", { name: /Pay \d+ XLM/i }).nth(1).click();
await sleep(5500);

// Step 4 — replay
await cap("Each passport burns a <b>one-time nullifier</b>. Replays are rejected by the chain.", 4000);
await click(/Replay a spent passport/i);
await sleep(6000);

// Under the hood
await cap("", 0);
await page.locator("#tech").scrollIntoViewIfNeeded(); await sleep(900);
await cap("Under the hood: a ~9.6k-constraint circuit and <b>two contracts deployed on Stellar testnet</b>.", 4000);
await page.evaluate(() => document.querySelectorAll('a[href*="stellar.expert"]')[0]?.scrollIntoView({ block: "center" }));
await sleep(4000);
await cap("", 500);

await card("Open source", "Reuses Nethermind's verifier · targets ERC-8004 agent identity", "github.com/leocagli/open-stellar-passport", 6000);

await sleep(500);
await context.close(); // finalize video
const vpath = await page.video().path();
await browser.close();
fs.copyFileSync(vpath, "../docs/demo.webm");
const kb = Math.round(fs.statSync("../docs/demo.webm").size / 1024);
console.log(`saved ../docs/demo.webm (${kb} KB)`);
console.log("page errors:", errs.length ? errs.join("\n") : "none");
