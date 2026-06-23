/* Toeshee client portal — FRONT-END PROTOTYPE.
 *
 * Accounts are stored in the browser (localStorage) so register / log in /
 * log out flows work for demonstration. This is NOT secure credential storage
 * and is intended as a placeholder for a real authentication backend.
 *
 * Responsibilities:
 *   - Site-wide: reflect logged-in state in the nav account link (.acct-link).
 *   - On portal.html: drive the login / create-account / dashboard views.
 */
(function () {
  "use strict";
  var LS_USERS = "toeshee_users";
  var LS_SESSION = "toeshee_session";

  function read(key, def) {
    try { return JSON.parse(localStorage.getItem(key)) || def; } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  function users() { return read(LS_USERS, []); }
  function saveUsers(list) { write(LS_USERS, list); }
  function session() { return read(LS_SESSION, null); }
  function setSession(email) { write(LS_SESSION, email); }
  function clearSession() { try { localStorage.removeItem(LS_SESSION); } catch (e) {} }
  function currentUser() {
    var s = session();
    if (!s) return null;
    return users().filter(function (u) { return u.email === s; })[0] || null;
  }
  async function hashPw(pw) {
    try {
      var enc = new TextEncoder().encode(pw + "::toeshee");
      var buf = await crypto.subtle.digest("SHA-256", enc);
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ("0" + b.toString(16)).slice(-2);
      }).join("");
    } catch (e) {
      return "plain:" + pw; // fallback for very old browsers (prototype only)
    }
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function firstName(u) { return (u && u.name ? u.name.split(" ")[0] : "there"); }

  /* ---- Nav account link (every page) ---- */
  function updateNav() {
    var links = document.querySelectorAll(".acct-link");
    var u = currentUser();
    Array.prototype.forEach.call(links, function (link) {
      link.textContent = u ? "Account" : "Log in";
      link.setAttribute("href", "portal.html");
    });
  }

  /* ---- Portal page ---- */
  function initPortal() {
    var authView = document.getElementById("portal-auth");
    var dashView = document.getElementById("portal-dash");
    if (!authView || !dashView) return; // not the portal page

    function showError(id, msg) {
      var el = document.getElementById(id);
      if (el) { el.textContent = msg; el.hidden = !msg; }
    }

    function renderDash() {
      var u = currentUser();
      if (!u) { renderAuth(); return; }
      authView.hidden = true;
      dashView.hidden = false;
      var nameEl = document.getElementById("dash-name");
      if (nameEl) nameEl.textContent = firstName(u);
      var d = document.getElementById("dash-details");
      if (d) {
        d.innerHTML =
          '<div class="dash-row"><span>Name</span><strong></strong></div>' +
          '<div class="dash-row"><span>Email</span><strong></strong></div>' +
          '<div class="dash-row"><span>Company</span><strong></strong></div>' +
          '<div class="dash-row"><span>Member since</span><strong></strong></div>';
        var strongs = d.querySelectorAll("strong");
        strongs[0].textContent = u.name || "—";
        strongs[1].textContent = u.email;
        strongs[2].textContent = u.company || "—";
        strongs[3].textContent = new Date(u.created).toLocaleDateString();
      }
      updateNav();
    }

    function renderAuth() {
      authView.hidden = false;
      dashView.hidden = true;
      updateNav();
    }

    // Tab switching
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

    // Register
    var regForm = document.getElementById("form-register");
    if (regForm) {
      regForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        showError("reg-err", "");
        var el = regForm.elements;
        var name = el["name"].value.trim();
        var email = el["email"].value.trim().toLowerCase();
        var company = el["company"].value.trim();
        var pw = el["password"].value;
        var pw2 = el["confirm"].value;
        if (!name) return showError("reg-err", "Please enter your name.");
        if (!company) return showError("reg-err", "Please enter your company name.");
        if (!validEmail(email)) return showError("reg-err", "Please enter a valid email address.");
        if (pw.length < 8) return showError("reg-err", "Password must be at least 8 characters.");
        if (pw !== pw2) return showError("reg-err", "Passwords do not match.");
        var list = users();
        if (list.some(function (u) { return u.email === email; })) {
          return showError("reg-err", "An account with that email already exists. Try logging in.");
        }
        var hashed = await hashPw(pw);
        list.push({ name: name, email: email, company: company, pass: hashed, created: Date.now() });
        saveUsers(list);
        setSession(email);
        renderDash();
      });
    }

    // Login
    var logForm = document.getElementById("form-login");
    if (logForm) {
      logForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        showError("log-err", "");
        var email = logForm.elements["email"].value.trim().toLowerCase();
        var pw = logForm.elements["password"].value;
        if (!validEmail(email)) return showError("log-err", "Please enter a valid email address.");
        var u = users().filter(function (x) { return x.email === email; })[0];
        var hashed = await hashPw(pw);
        if (!u || u.pass !== hashed) return showError("log-err", "Incorrect email or password.");
        setSession(email);
        renderDash();
      });
    }

    // Logout
    var logoutBtn = document.getElementById("dash-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        clearSession();
        renderAuth();
        selectTab("login");
      });
    }

    // Initial view
    if (currentUser()) renderDash(); else { renderAuth(); selectTab("login"); }
  }

  function init() { updateNav(); initPortal(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
