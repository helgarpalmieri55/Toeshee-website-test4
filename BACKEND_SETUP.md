# Toeshee backend setup — GoDaddy (PHP + MySQL)

This site is static HTML + a small PHP API. The PHP endpoints power three
things: the AI chatbot, the Request Information form, and the client portal
login. Your workflow stays the same: **edit with Claude Code → push to GitHub →
GitHub Action deploys to GoDaddy automatically.**

```
Browser ──> static HTML/JS (public_html)
              │
              ├─ /api/chat.php     → Claude API (key stays server-side)
              ├─ /api/contact.php  → MySQL: contact_submissions
              └─ /api/auth.php     → MySQL: users (sessions cookie)
```

## What you need
- A GoDaddy **Web Hosting** plan (cPanel / Linux — has PHP 8 + MySQL). *Not* the
  Website Builder product.
- An **Anthropic API key** (console.anthropic.com) for the chatbot.
- Your GitHub repo (already set up).

---

## One-time setup

### 1. Create the database (cPanel)
1. cPanel → **MySQL Databases**.
2. Create a database (e.g. `toeshee_db`), a user, a password, and **add the user
   to the database with All Privileges**. Note the DB name, user, password — and
   that the host is usually `localhost`.
3. cPanel → **phpMyAdmin** → select the database → **Import** → upload
   `db/schema.sql` from this repo. This creates the `users`,
   `contact_submissions`, and `chat_logs` tables.

### 2. Create the secrets file `api/config.php` (never in Git)
`api/config.php` is git-ignored on purpose and blocked from the web by
`api/.htaccess`. Create it once **on the server** (cPanel → File Manager →
`public_html/api/`), copying `config.example.php` and filling in real values:

```php
<?php
return [
    'db_host' => 'localhost',
    'db_name' => 'toeshee_db',
    'db_user' => 'toeshee_user',
    'db_pass' => 'YOUR_DB_PASSWORD',
    'anthropic_api_key' => 'sk-ant-...',
    'claude_model' => 'claude-opus-4-8', // or 'claude-haiku-4-5' (cheaper/faster)
    'notify_email' => 'sales@toeshee.com', // '' to skip email notifications
    'log_chats' => false,
];
```
The GitHub deploy never overwrites or deletes this file.

### 3. Set up auto-deploy (GitHub → GoDaddy)
1. cPanel → **FTP Accounts** → note the FTP host, username, password.
2. GitHub repo → **Settings → Secrets and variables → Actions** → add:
   - `FTP_SERVER` (e.g. `ftp.toeshee.com`)
   - `FTP_USERNAME`
   - `FTP_PASSWORD`
3. The workflow in `.github/workflows/deploy.yml` deploys on every push to
   `main`. (Change the branch in that file if you publish from another branch.)
   You can also run it manually from the **Actions** tab.

### 4. Point your GoDaddy domain at the hosting
If the domain and hosting are both on GoDaddy this is usually automatic. Confirm
the site loads at your domain over **https** (cPanel includes free SSL; turn on
"Force HTTPS").

---

## Daily workflow
1. Ask Claude Code for changes → it commits to the repo.
2. Merge/push to `main`.
3. GitHub Action uploads the changed files to `public_html`. Done.

`api/config.php` lives only on the server, so your secrets are never in GitHub.

---

## How each feature uses the backend
| Feature | Endpoint | Storage |
|---|---|---|
| AI chatbot | `POST /api/chat.php` | (optional) `chat_logs` |
| Request Information form | `POST /api/contact.php` | `contact_submissions` (+ optional email) |
| Portal register/login/logout | `POST /api/auth.php?action=…` | `users` (+ PHP session cookie) |

**Graceful fallback:** if the API isn't reachable (e.g. you open the files
locally without PHP), the chatbot falls back to its built-in knowledge base and
the portal falls back to a browser-only prototype. On GoDaddy with the API in
place, the real backend is used automatically — no code change needed.

## Viewing submissions & accounts
cPanel → phpMyAdmin → your database → browse the `contact_submissions` and
`users` tables. (You can also build admin views later.)

## Security notes
- Passwords are stored with PHP `password_hash()` (bcrypt) — never plaintext.
- `api/config.php`, `*.sql`, and internal includes are denied web access via
  `api/.htaccess`.
- Keep `Force HTTPS` on so the session cookie and form data are encrypted.
- The chatbot caps history/length and the Claude API key never leaves the server.

## Files
- `api/_bootstrap.php` — shared config loader + DB helper
- `api/chat.php` — Claude proxy
- `api/contact.php` — contact form → MySQL
- `api/auth.php` — register / login / logout / me
- `api/config.example.php` — template for `api/config.php`
- `api/.htaccess` — blocks secret files
- `db/schema.sql` — database tables
- `.github/workflows/deploy.yml` — FTP auto-deploy
