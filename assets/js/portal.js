/* Toeshee client portal — front end.
 *
 * Primary mode: talks to the PHP backend (api/auth.php) with real accounts in
 * MySQL and a server session cookie.
 * Fallback mode: if the backend is unreachable (e.g. static local preview),
 * it transparently falls back to a browser-only (localStorage) prototype so
 * the flows still demo. Once deployed to GoDaddy with the API in place, the
 * backend is used automatically.
 */
(function () {
  "use strict";
  var AUTH = "/api/auth.php";

  /* ---------- localStorage fallback store ---------- */
  var LS_USERS = "toeshee_users";
  var LS_SESSION = "toeshee_session";
  function lread(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function lwrite(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function lusers() { return lread(LS_USERS, []); }
  function lsession() { return lread(LS_SESSION, null); }
  function lcurrentUser() {
    var s = lsession(); if (!s) return null;
    return lusers().filter(function (u) { return u.email === s; })[0] || null;
  }
  async function hashPw(pw) {
    try {
      var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw + "::toeshee"));
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
    } catch (e) { return "plain:" + pw; }
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function firstName(u) { return (u && u.name ? u.name.split(" ")[0] : "there"); }

  async function localRegister(p) {
    if (!p.name) return { error: "Please enter your name." };
    if (!p.company) return { error: "Please enter your company name." };
    if (!validEmail(p.email)) return { error: "Please enter a valid email address." };
    if (p.password.length < 8) return { error: "Password must be at least 8 characters." };
    var list = lusers();
    if (list.some(function (u) { return u.email === p.email; })) return { error: "An account with that email already exists. Try logging in." };
    var hashed = await hashPw(p.password);
    var rec = { name: p.name, company: p.company, email: p.email, pass: hashed, created: Date.now() };
    list.push(rec); lwrite(LS_USERS, list); lwrite(LS_SESSION, p.email);
    return { user: { name: rec.name, email: rec.email, company: rec.company, created: rec.created } };
  }
  async function localLogin(p) {
    var u = lusers().filter(function (x) { return x.email === p.email; })[0];
    var hashed = await hashPw(p.password);
    if (!u || u.pass !== hashed) return { error: "Incorrect email or password." };
    lwrite(LS_SESSION, p.email);
    return { user: { name: u.name, email: u.email, company: u.company, created: u.created } };
  }
  function localLogout() { try { localStorage.removeItem(LS_SESSION); } catch (e) {} }

  /* ---------- API helper ---------- */
  async function api(action, method, body) {
    var res = await fetch(AUTH + "?action=" + action, {
      method: method || "GET",
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    return { status: res.status, ok: res.ok, data: data };
  }

  /* ---------- unified operations (API first, local fallback) ---------- */
  async function getUser() {
    try { var r = await api("me"); return r.data.user || null; }
    catch (e) { return lcurrentUser(); }
  }
  async function register(p) {
    try {
      var r = await api("register", "POST", p);
      return r.ok ? { user: r.data.user } : { error: r.data.error || "Registration failed." };
    } catch (e) { return localRegister(p); }
  }
  async function login(p) {
    try {
      var r = await api("login", "POST", p);
      return r.ok ? { user: r.data.user } : { error: r.data.error || "Login failed." };
    } catch (e) { return localLogin(p); }
  }
  async function logout() {
    try { await api("logout", "POST", {}); } catch (e) { localLogout(); }
    localLogout(); // clear local too, regardless
  }

  /* ---------- Nav account link (every page) ---------- */
  async function updateNav() {
    var links = document.querySelectorAll(".acct-link");
    if (!links.length) return;
    var u = await getUser();
    Array.prototype.forEach.call(links, function (link) {
      link.textContent = u ? "Account" : "Log in";
      link.setAttribute("href", "portal.html");
    });
  }

  /* ---------- Portal page ---------- */
  function initPortal() {
    var authView = document.getElementById("portal-auth");
    var dashView = document.getElementById("portal-dash");
    if (!authView || !dashView) return;

    function showError(id, msg) {
      var el = document.getElementById(id);
      if (el) { el.textContent = msg; el.hidden = !msg; }
    }
    function setNavText(u) {
      document.querySelectorAll(".acct-link").forEach(function (l) { l.textContent = u ? "Account" : "Log in"; });
    }

    function renderDash(u) {
      authView.hidden = true; dashView.hidden = false;
      var nameEl = document.getElementById("dash-name");
      if (nameEl) nameEl.textContent = firstName(u);
      var d = document.getElementById("dash-details");
      if (d) {
        d.innerHTML =
          '<div class="dash-row"><span>Name</span><strong></strong></div>' +
          '<div class="dash-row"><span>Email</span><strong></strong></div>' +
          '<div class="dash-row"><span>Company</span><strong></strong></div>' +
          '<div class="dash-row"><span>Member since</span><strong></strong></div>';
        var st = d.querySelectorAll("strong");
        st[0].textContent = u.name || "—";
        st[1].textContent = u.email;
        st[2].textContent = u.company || "—";
        var dt = u.created ? new Date(u.created) : null;
        st[3].textContent = dt && !isNaN(dt) ? dt.toLocaleDateString() : "—";
      }
      setNavText(u);
    }
    function renderAuth() {
      authView.hidden = false; dashView.hidden = true; setNavText(null);
    }

    // Tabs
    var tabs = authView.querySelectorAll("[data-tab]");
    var panels = { login: document.getElementById("tab-login"), register: document.getElementById("tab-register") };
    function selectTab(name) {
      Array.prototype.forEach.call(tabs, function (t) {
        var on = t.getAttribute("data-tab") === name;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      if (panels.login) panels.login.hidden = name !== "login";
      if (panels.register) panels.register.hidden = name !== "register";
    }
    Array.prototype.forEach.call(tabs, function (t) {
      t.addEventListener("click", function () { selectTab(t.getAttribute("data-tab")); });
    });

    function busy(form, on, label) {
      var btn = form.querySelector('button[type=submit]');
      if (!btn) return;
      if (on) { btn.dataset.label = btn.textContent; btn.textContent = "Please wait…"; btn.disabled = true; }
      else { btn.textContent = btn.dataset.label || label; btn.disabled = false; }
    }

    var regForm = document.getElementById("form-register");
    if (regForm) {
      regForm.addEventListener("submit", async function (e) {
        e.preventDefault(); showError("reg-err", "");
        var el = regForm.elements;
        var payload = {
          name: el["name"].value.trim(),
          company: el["company"].value.trim(),
          email: el["email"].value.trim().toLowerCase(),
          password: el["password"].value,
          confirm: el["confirm"].value
        };
        if (!payload.name) return showError("reg-err", "Please enter your name.");
        if (!payload.company) return showError("reg-err", "Please enter your company name.");
        if (!validEmail(payload.email)) return showError("reg-err", "Please enter a valid email address.");
        if (payload.password.length < 8) return showError("reg-err", "Password must be at least 8 characters.");
        if (payload.password !== payload.confirm) return showError("reg-err", "Passwords do not match.");
        busy(regForm, true);
        var r = await register({ name: payload.name, company: payload.company, email: payload.email, password: payload.password });
        busy(regForm, false, "Create account");
        if (r.error) return showError("reg-err", r.error);
        renderDash(r.user);
      });
    }

    var logForm = document.getElementById("form-login");
    if (logForm) {
      logForm.addEventListener("submit", async function (e) {
        e.preventDefault(); showError("log-err", "");
        var email = logForm.elements["email"].value.trim().toLowerCase();
        var pw = logForm.elements["password"].value;
        if (!validEmail(email)) return showError("log-err", "Please enter a valid email address.");
        busy(logForm, true);
        var r = await login({ email: email, password: pw });
        busy(logForm, false, "Log in");
        if (r.error) return showError("log-err", r.error);
        renderDash(r.user);
      });
    }

    var logoutBtn = document.getElementById("dash-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async function () {
        await logout(); renderAuth(); selectTab("login");
      });
    }

    // Initial view
    getUser().then(function (u) { if (u) renderDash(u); else { renderAuth(); selectTab("login"); } });
  }

  function init() { updateNav(); initPortal(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
