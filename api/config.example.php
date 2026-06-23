<?php
/* Copy this file to  api/config.php  and fill in your real values.
 * api/config.php is git-ignored (never committed) and blocked from the web by
 * api/.htaccess. On GoDaddy you create the DB + user in cPanel → MySQL Databases.
 */
return [
    // --- MySQL (from cPanel → MySQL Databases) ---
    'db_host' => 'localhost',          // GoDaddy shared hosting is usually 'localhost'
    'db_name' => 'YOUR_DB_NAME',
    'db_user' => 'YOUR_DB_USER',
    'db_pass' => 'YOUR_DB_PASSWORD',

    // --- Anthropic (Claude) API ---
    'anthropic_api_key' => 'sk-ant-xxxxxxxx',
    'claude_model'      => 'claude-opus-4-8', // or 'claude-haiku-4-5' for a cheaper FAQ bot

    // --- Optional: where contact-form notifications are emailed (leave '' to skip) ---
    'notify_email' => '', // e.g. 'sales@toeshee.com'

    // --- Optional: log chatbot conversations to the chat_logs table ---
    'log_chats' => false,
];
