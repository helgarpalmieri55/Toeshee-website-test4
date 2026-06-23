/* Toeshee AI assistant — serverless backend (Claude API proxy).
 *
 * This file deploys ALONGSIDE the static site on platforms that run serverless
 * functions (Vercel, Netlify, Cloudflare Pages, etc.) — it is NOT a separate
 * server you run or maintain. It keeps the Anthropic API key server-side so it
 * is never exposed in the browser.
 *
 * Setup (see CHATBOT_SETUP.md for full details):
 *   1. Deploy the site to a host that supports serverless functions.
 *   2. Set the environment variable ANTHROPIC_API_KEY in the host dashboard.
 *      (Optional) CLAUDE_MODEL to override the default model.
 *   3. Point the widget at this endpoint, e.g. on each page before chatbot.js:
 *        <script>window.TOESHEE_CHAT_ENDPOINT = "/api/chat";</script>
 *
 * This is the default Vercel/Node handler signature (req, res). Netlify and
 * Cloudflare variants are documented in CHATBOT_SETUP.md.
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-4-8";

const SYSTEM_PROMPT = `You are the Toeshee website assistant. You answer questions from visitors about Toeshee, concisely and helpfully, in a precise, credible, professional voice.

ABOUT TOESHEE
- Toeshee is the first outsourcing provider built for the decentralized economy: crypto-native customer support infrastructure for Web3, blockchain, fintech, and iGaming companies.
- Operated by Center Source Group under the TOESHEE brand.

SERVICES (solutions)
- Crypto Customer Support — multilingual, crypto-fluent agents across live chat, email, voice, and social (wallets, transactions, KYC, on/off-ramp).
- Technical Support — API, integration, and product support for crypto and fintech platforms.
- Trust & Safety — content moderation, account integrity, abuse prevention.
- Risk & Fraud Response — fraud detection, dispute handling, risk operations.
- Security & Compliance — KYC/AML support, compliance operations, security-aware workflows from access-controlled, auditable delivery centers.

INDUSTRIES SERVED
- Fintech, iGaming, Crypto Exchanges, DeFi, Crypto Payments.

DELIVERY & LOCATIONS
- Delivery operations in Colombia, Panama, and the Dominican Republic; principal place of business in the United States. Nearshore coverage with strong time-zone overlap for the Americas and Europe. Support in English and Spanish (more on request). Coverage can be built around client needs, including 24/7.

RESULTS (typical, post-deployment)
- Average resolution time reduced from ~12 hours to ~5.5 hours.
- Service levels raised from ~80% to 94–96%, sustained.

CONTACT & NEXT STEPS
- Sales: sales@toeshee.com. Phone: +1 (866) 715-7327. Legal/compliance: compliance@center-source.com. Careers: awesome.jobs@toeshee.com.
- To engage, visitors use the "Request Information" form on the site, or create an account in the client portal for future features.

RULES
- Only answer questions about Toeshee, its services, industries, delivery model, results, and how to engage. If asked something unrelated, politely redirect to what you can help with.
- Do NOT invent specific prices, contract terms, SLAs beyond those above, client names, or commitments. For pricing or specifics, direct the visitor to the Request Information form or sales@toeshee.com.
- Keep answers short (2–5 sentences) unless asked for detail. Be warm but precise. Never fabricate.`;

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return send(res, 500, { error: "Server not configured: missing ANTHROPIC_API_KEY" });

  try {
    let bodyData = req.body;
    if (typeof bodyData === "string") bodyData = JSON.parse(bodyData || "{}");
    if (!bodyData) {
      // Some runtimes don't pre-parse — read the stream.
      bodyData = await new Promise((resolve) => {
        let raw = "";
        req.on("data", (c) => (raw += c));
        req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch (e) { resolve({}); } });
      });
    }

    const incoming = Array.isArray(bodyData.messages) ? bodyData.messages : [];
    // Sanitize: keep last 12 turns, valid roles, cap content length.
    const messages = incoming
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return send(res, 400, { error: "A user message is required." });
    }

    const apiRes = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error", apiRes.status, detail);
      return send(res, 502, { error: "Upstream error from the AI service." });
    }

    const data = await apiRes.json();
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return send(res, 200, { reply: reply || "Sorry, I couldn't generate a response. Please email sales@toeshee.com." });
  } catch (err) {
    console.error("chat handler error", err);
    return send(res, 500, { error: "Unexpected server error." });
  }
};
