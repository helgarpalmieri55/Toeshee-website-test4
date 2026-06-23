# Toeshee AI Assistant & Client Portal — setup

This site ships two new front-end features that work **today** with no backend,
and a chatbot that **upgrades to a real Claude LLM** once you add an API key.

## 1. AI chatbot

The floating chat button (bottom-right of every page) is driven by
`assets/js/chatbot.js`. It has two modes:

| Mode | When | Behaviour |
|------|------|-----------|
| **Offline** (default) | No endpoint configured | Answers from a built-in Toeshee knowledge base compiled from the site. Always available. |
| **Live LLM** | An endpoint is configured | Sends the conversation to your serverless function, which calls the Claude API server-side. |

### Turning on the real LLM

You said you don't want to run a separate server — and you don't have to. The
chatbot talks to a **serverless function** (`api/chat.js`) that deploys
*alongside* the static site on hosts like **Vercel, Netlify, or Cloudflare
Pages**. The function holds the API key, so it is never exposed in the browser.

**Steps**

1. **Deploy the site** to a host that supports serverless functions.
   - Vercel: `api/chat.js` is auto-detected as a function at `/api/chat`.
   - Netlify: move/rename to `netlify/functions/chat.js` (see variant below) → `/.netlify/functions/chat`.
   - Cloudflare Pages: place under `functions/api/chat.js`.
2. **Add the API key** in your host's environment variables:
   - `ANTHROPIC_API_KEY` = your Anthropic API key (required)
   - `CLAUDE_MODEL` = `claude-opus-4-8` (optional; default). For a cheaper,
     faster FAQ bot you can set `claude-haiku-4-5`.
3. **Point the widget at the endpoint.** Add this line on each page *before*
   `assets/js/chatbot.js` (or just on the pages you want it live):

   ```html
   <script>window.TOESHEE_CHAT_ENDPOINT = "/api/chat";</script>
   ```

   Alternatives: `<body data-chat-endpoint="/api/chat">`, or in the browser
   console `localStorage.setItem('toeshee_chat_endpoint','/api/chat')`.

If the endpoint ever errors, the widget automatically falls back to the offline
knowledge base so visitors are never stuck.

### What you need beyond the website files
- **An Anthropic API key** (from console.anthropic.com).
- **A database is optional** — the chatbot itself doesn't require one. If you
  want to log conversations or rate-limit, your serverless function can write to
  whatever database you use (e.g. Supabase/Firebase); add that inside `api/chat.js`.

### Netlify function variant
Netlify uses a slightly different signature. Create `netlify/functions/chat.js`:

```js
const handler = require("../../api/chat.js"); // reuse the logic, or inline it
exports.handler = async (event) => {
  const req = { method: event.httpMethod, body: event.body, on: () => {} };
  let status = 200, body = "{}";
  const res = { statusCode: 200, setHeader(){}, end(b){ body=b; status=this.statusCode; } };
  await handler(req, res);
  return { statusCode: status, headers: { "Content-Type": "application/json" }, body };
};
```
(For Cloudflare Pages Functions, adapt to the `onRequestPost` signature.)

## 2. Client portal & accounts

The **Log in / Account** button in the navigation links to `portal.html`, which
supports register / log in / log out and a placeholder dashboard
(`assets/js/portal.js`).

**This is a front-end prototype.** Accounts are stored in the browser
(`localStorage`) so the flows are fully demonstrable, but it is **not** secure
credential storage. To make it production-ready, replace the localStorage logic
in `portal.js` with calls to a real auth backend (e.g. Supabase Auth, Auth0,
Firebase Auth, or your own API). The UI and views can stay as-is.

## Files added
- `assets/js/chatbot.js` — chat widget (offline KB + live-LLM modes)
- `assets/js/portal.js` — portal/auth prototype + nav account state
- `api/chat.js` — serverless Claude proxy (keeps the API key server-side)
- `portal.html` — login / create-account / dashboard page
