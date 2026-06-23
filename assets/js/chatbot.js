/* Toeshee AI assistant — floating chat widget.
 *
 * Two modes, automatic:
 *   1. LIVE LLM  — if an endpoint is configured (see CONFIG below), the widget
 *      POSTs the conversation to your serverless function, which calls the
 *      Claude API server-side (so the API key is never exposed in the browser).
 *   2. OFFLINE   — with no endpoint, it answers from a built-in Toeshee
 *      knowledge base compiled from the website. Always available, no backend.
 *
 * To switch on the real LLM once the site is live, set ONE of:
 *   - window.TOESHEE_CHAT_ENDPOINT = "/api/chat";   (before this script loads)
 *   - <body data-chat-endpoint="/api/chat">
 *   - localStorage.setItem('toeshee_chat_endpoint','/api/chat')
 * See CHATBOT_SETUP.md for the serverless function and deployment steps.
 */
(function () {
  "use strict";
  if (window.__toesheeChatLoaded) return;
  window.__toesheeChatLoaded = true;

  var ENDPOINT =
    window.TOESHEE_CHAT_ENDPOINT ||
    (document.body && document.body.getAttribute("data-chat-endpoint")) ||
    (function () { try { return localStorage.getItem("toeshee_chat_endpoint"); } catch (e) { return null; } })() ||
    null;

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Knowledge base (offline mode) ---------- */
  var KB = [
    { k: ["what", "who", "about", "do", "toeshee", "company", "offer overview"],
      a: "Toeshee is the first outsourcing provider built for the decentralized economy — crypto-native customer support infrastructure for Web3, blockchain, fintech, and iGaming companies. We run disciplined, SLA-driven support operations so your users get fast, expert help around the clock." },
    { k: ["service", "services", "solution", "solutions", "what can you do", "offerings"],
      a: "Our solutions span five disciplines:\n• Crypto Customer Support\n• Technical Support\n• Trust & Safety\n• Risk & Fraud Response\n• Security & Compliance\nEach is delivered by agents trained for the decentralized economy. See the Solutions page for detail." },
    { k: ["crypto support", "customer support", "support"],
      a: "Crypto Customer Support is our core service: multilingual, crypto-fluent agents handling live chat, email, voice, and social — covering wallets, transactions, KYC, and on/off-ramp questions with measurable SLAs." },
    { k: ["technical", "tech support"],
      a: "Technical Support covers API, integration, and product issues for crypto and fintech platforms — agents who can speak the language of your engineers and your users alike." },
    { k: ["trust", "safety"],
      a: "Trust & Safety covers content moderation, account integrity, and abuse prevention to keep your platform and community safe." },
    { k: ["risk", "fraud", "chargeback"],
      a: "Risk & Fraud Response covers fraud detection, dispute handling, and risk operations tuned for crypto and high-velocity payments." },
    { k: ["security", "compliance", "kyc", "aml", "regulat"],
      a: "Security & Compliance covers KYC/AML support, compliance operations, and security-aware workflows, run from access-controlled, auditable delivery centers." },
    { k: ["industr", "vertical", "sector", "who do you serve", "who do you work with"],
      a: "We serve Fintech, iGaming, Crypto Exchanges, DeFi, and Crypto Payments companies. Each industry has a dedicated page describing how we support it." },
    { k: ["where", "location", "based", "office", "team based", "nearshore", "country", "countries"],
      a: "Our delivery operations span Colombia, Panama, and the Dominican Republic, with a principal place of business in the United States — nearshore coverage with strong time-zone overlap for the Americas and Europe." },
    { k: ["language", "languages", "multilingual", "spanish", "english"],
      a: "Our nearshore teams deliver support in English and Spanish, with additional language coverage available depending on your needs — just ask in your request." },
    { k: ["result", "results", "sla", "performance", "metric", "metrics", "kpi", "service level"],
      a: "Typical outcomes after deployment: average resolution time cut from ~12 hours to ~5.5 hours, and service levels raised from ~80% to 94–96% — sustained post-deployment. See Case Studies for the full picture." },
    { k: ["case", "case study", "case studies", "proof", "example", "results story"],
      a: "Our Case Studies page details real engagements — including moving resolution from 12h to 5.5h and lifting service levels into the mid-90s. Visit case-studies.html." },
    { k: ["price", "pricing", "cost", "quote", "how much", "rate", "rates"],
      a: "Pricing is tailored to your volume, channels, languages, and coverage hours. Share your needs via the Request Information form (the “Request Information” button) and we'll come back with specifics within 24 hours — no slide decks." },
    { k: ["start", "get started", "onboard", "begin", "next step", "sign up", "trial", "demo", "request information", "talk"],
      a: "Getting started is simple: use the Request Information form on the site (the “Request Information” button), tell us about your support operation, and we'll schedule an intro call. You can also create an account in the client portal for future features." },
    { k: ["contact", "email", "phone", "reach", "call", "get in touch"],
      a: "You can reach us at sales@toeshee.com or +1 (866) 715-7327. For legal or compliance matters: compliance@center-source.com. Or use the Request Information form on any page." },
    { k: ["account", "login", "log in", "sign in", "register", "portal", "create account"],
      a: "Use the Log in / Create account button in the navigation to register for the Toeshee client portal — your home for future features. You can create an account and sign in right from the portal page." },
    { k: ["career", "careers", "job", "jobs", "hiring", "work for", "apply"],
      a: "We're growing our nearshore teams. See the Careers page (careers.html) for open roles, or email awesome.jobs@toeshee.com." },
    { k: ["privacy", "data", "gdpr", "terms", "policy", "cookie"],
      a: "Our Privacy Policy, Terms and Conditions, and Cookie Policy are linked in the site footer. For privacy requests, contact compliance@center-source.com." },
    { k: ["hours", "24/7", "coverage", "availability", "around the clock"],
      a: "We build coverage around your needs — including 24/7 operations. Tell us your required hours in the Request Information form and we'll design coverage to match." }
  ];

  function offlineAnswer(text) {
    var q = (text || "").toLowerCase();
    var words = q.split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; });
    var best = null, bestScore = 0;
    KB.forEach(function (item) {
      var score = 0;
      item.k.forEach(function (key) {
        if (q.indexOf(key) !== -1) score += key.split(" ").length * 2;
        key.split(" ").forEach(function (kw) {
          if (kw.length > 2 && words.indexOf(kw) !== -1) score += 1;
        });
      });
      if (score > bestScore) { bestScore = score; best = item; }
    });
    if (best && bestScore >= 2) return best.a;
    return "I can help with questions about Toeshee — our crypto-native support services, the industries we serve, where our teams are based, results, pricing, getting started, or contacting us. Try one of the suggestions, or ask away. You can also reach a human at sales@toeshee.com.";
  }

  /* ---------- Styles ---------- */
  var css = [
    ".tsb-fab{position:fixed;right:22px;bottom:22px;z-index:400;width:60px;height:60px;border-radius:50%;border:none;background:#FF3A10;color:#fff;cursor:pointer;box-shadow:0 10px 30px rgba(255,58,16,.35);display:flex;align-items:center;justify-content:center;transition:transform .25s cubic-bezier(.16,1,.3,1),background .25s}",
    ".tsb-fab:hover{background:#D42E0A;transform:translateY(-2px)}",
    ".tsb-fab:focus-visible{outline:3px solid #FF3A10;outline-offset:3px}",
    ".tsb-fab svg{width:26px;height:26px}",
    ".tsb-fab .tsb-x{display:none}",
    ".tsb-open .tsb-fab .tsb-chat{display:none}",
    ".tsb-open .tsb-fab .tsb-x{display:block}",
    ".tsb-panel{position:fixed;right:22px;bottom:94px;z-index:400;width:380px;max-width:calc(100vw - 32px);height:560px;max-height:calc(100vh - 130px);background:#fff;border:1px solid rgba(17,17,20,.1);border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;opacity:0;visibility:hidden;transform:translateY(12px);transition:opacity .25s,transform .25s,visibility .25s;font-family:'Figtree',system-ui,sans-serif}",
    ".tsb-open .tsb-panel{opacity:1;visibility:visible;transform:translateY(0)}",
    ".tsb-head{background:#111114;color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0}",
    ".tsb-head .tsb-dot{width:9px;height:9px;border-radius:50%;background:#FF3A10;flex-shrink:0}",
    ".tsb-head h3{margin:0;font-size:.98rem;font-weight:700;font-family:'Bricolage Grotesque',sans-serif;letter-spacing:-.01em}",
    ".tsb-head p{margin:1px 0 0;font-size:.72rem;color:rgba(255,255,255,.6)}",
    ".tsb-head .tsb-close{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;padding:4px;border-radius:6px;line-height:0}",
    ".tsb-head .tsb-close:hover{color:#fff}",
    ".tsb-body{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;background:#faf9f7}",
    ".tsb-msg{max-width:85%;padding:11px 14px;border-radius:14px;font-size:.9rem;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}",
    ".tsb-bot{align-self:flex-start;background:#fff;border:1px solid rgba(17,17,20,.08);color:#1a1a1f;border-bottom-left-radius:4px}",
    ".tsb-user{align-self:flex-end;background:#FF3A10;color:#fff;border-bottom-right-radius:4px}",
    ".tsb-typing{align-self:flex-start;display:flex;gap:4px;padding:13px 16px;background:#fff;border:1px solid rgba(17,17,20,.08);border-radius:14px}",
    ".tsb-typing span{width:7px;height:7px;border-radius:50%;background:#bbb;animation:tsb-bounce 1.2s infinite}",
    ".tsb-typing span:nth-child(2){animation-delay:.15s}.tsb-typing span:nth-child(3){animation-delay:.3s}",
    "@keyframes tsb-bounce{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}",
    ".tsb-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 18px 10px;background:#faf9f7}",
    ".tsb-chip{font-family:inherit;font-size:.78rem;font-weight:600;color:#FF3A10;background:#fff;border:1.5px solid rgba(255,58,16,.3);border-radius:999px;padding:7px 12px;cursor:pointer;transition:background .2s,border-color .2s}",
    ".tsb-chip:hover{background:rgba(255,58,16,.07);border-color:#FF3A10}",
    ".tsb-foot{border-top:1px solid rgba(17,17,20,.08);padding:12px;display:flex;gap:8px;background:#fff;flex-shrink:0}",
    ".tsb-foot input{flex:1;border:1.5px solid rgba(17,17,20,.12);border-radius:10px;padding:11px 13px;font-family:inherit;font-size:.9rem;color:#1a1a1f;outline:none}",
    ".tsb-foot input:focus{border-color:#FF3A10}",
    ".tsb-foot button{background:#FF3A10;border:none;color:#fff;border-radius:10px;width:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:background .2s}",
    ".tsb-foot button:hover{background:#D42E0A}",
    ".tsb-foot button:disabled{opacity:.5;cursor:default}",
    ".tsb-note{font-size:.66rem;color:#9a9aa2;text-align:center;padding:0 12px 10px;background:#fff}",
    reduced ? ".tsb-panel,.tsb-fab,.tsb-typing span{transition:none!important;animation:none!important}" : ""
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */
  var root = document.createElement("div");
  root.innerHTML =
    '<button class="tsb-fab" id="tsb-fab" aria-label="Open Toeshee assistant" aria-expanded="false" aria-controls="tsb-panel">' +
      '<svg class="tsb-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.38 8.38 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"/></svg>' +
      '<svg class="tsb-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    '</button>' +
    '<section class="tsb-panel" id="tsb-panel" role="dialog" aria-label="Toeshee assistant" aria-modal="false">' +
      '<div class="tsb-head"><span class="tsb-dot"></span><div><h3>Toeshee Assistant</h3><p>Ask about our crypto support services</p></div>' +
        '<button class="tsb-close" id="tsb-close" aria-label="Close assistant"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '</div>' +
      '<div class="tsb-body" id="tsb-body" aria-live="polite"></div>' +
      '<div class="tsb-chips" id="tsb-chips"></div>' +
      '<form class="tsb-foot" id="tsb-form"><input id="tsb-input" type="text" placeholder="Type your question…" autocomplete="off" aria-label="Message"><button type="submit" id="tsb-send" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg></button></form>' +
      '<div class="tsb-note">AI assistant · answers from Toeshee site info · for anything urgent, email sales@toeshee.com</div>' +
    '</section>';
  document.body.appendChild(root);

  var fab = document.getElementById("tsb-fab");
  var panel = document.getElementById("tsb-panel");
  var body = document.getElementById("tsb-body");
  var chipsWrap = document.getElementById("tsb-chips");
  var form = document.getElementById("tsb-form");
  var input = document.getElementById("tsb-input");
  var sendBtn = document.getElementById("tsb-send");
  var closeBtn = document.getElementById("tsb-close");

  var history = []; // {role:'user'|'assistant', content}
  var started = false;

  var SUGGESTIONS = [
    "What does Toeshee do?",
    "Which services do you offer?",
    "Which industries do you serve?",
    "Where are your teams based?",
    "How do I get started?",
    "How can I contact you?"
  ];

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function addMsg(role, text) {
    var el = document.createElement("div");
    el.className = "tsb-msg " + (role === "user" ? "tsb-user" : "tsb-bot");
    el.innerHTML = escapeHtml(text);
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function renderChips() {
    chipsWrap.innerHTML = "";
    SUGGESTIONS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tsb-chip";
      b.textContent = s;
      b.addEventListener("click", function () { submit(s); });
      chipsWrap.appendChild(b);
    });
  }

  function showTyping() {
    var t = document.createElement("div");
    t.className = "tsb-typing";
    t.id = "tsb-typing";
    t.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(t);
    body.scrollTop = body.scrollHeight;
  }
  function hideTyping() {
    var t = document.getElementById("tsb-typing");
    if (t) t.remove();
  }

  function start() {
    if (started) return;
    started = true;
    addMsg("assistant", "Hi! I'm the Toeshee assistant. Ask me anything about our crypto-native support services, the industries we serve, or how to get started.");
    renderChips();
  }

  function openPanel() {
    document.documentElement.classList.add("tsb-open");
    fab.setAttribute("aria-expanded", "true");
    fab.setAttribute("aria-label", "Close Toeshee assistant");
    start();
    setTimeout(function () { input.focus(); }, 250);
  }
  function closePanel() {
    document.documentElement.classList.remove("tsb-open");
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-label", "Open Toeshee assistant");
    fab.focus();
  }
  function toggle() {
    if (document.documentElement.classList.contains("tsb-open")) closePanel();
    else openPanel();
  }

  async function respond(text) {
    showTyping();
    if (ENDPOINT) {
      try {
        var res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history })
        });
        if (!res.ok) throw new Error("bad status " + res.status);
        var data = await res.json();
        var reply = (data && (data.reply || data.text || data.content)) || "";
        hideTyping();
        if (!reply) throw new Error("empty");
        history.push({ role: "assistant", content: reply });
        addMsg("assistant", reply);
        return;
      } catch (e) {
        // fall through to offline answer so the user is never stuck
        hideTyping();
        var fb = offlineAnswer(text);
        history.push({ role: "assistant", content: fb });
        addMsg("assistant", fb);
        return;
      }
    }
    // Offline mode — small delay for natural feel
    setTimeout(function () {
      hideTyping();
      var ans = offlineAnswer(text);
      history.push({ role: "assistant", content: ans });
      addMsg("assistant", ans);
    }, reduced ? 0 : 420);
  }

  function submit(text) {
    text = (text || "").trim();
    if (!text) return;
    chipsWrap.style.display = "none";
    addMsg("user", text);
    history.push({ role: "user", content: text });
    respond(text);
  }

  fab.addEventListener("click", toggle);
  closeBtn.addEventListener("click", closePanel);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = "";
    submit(v);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && document.documentElement.classList.contains("tsb-open")) closePanel();
  });
})();
