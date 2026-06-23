<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_post();

$config = load_config();
$apiKey = $config['anthropic_api_key'] ?? '';
if ($apiKey === '' || strpos($apiKey, 'xxxx') !== false) {
    json_out(500, ['error' => 'Server not configured: missing anthropic_api_key.']);
}

$model = $config['claude_model'] ?? 'claude-opus-4-8';

$SYSTEM_PROMPT = <<<TXT
You are the Toeshee website assistant. You answer questions from visitors about Toeshee, concisely and helpfully, in a precise, credible, professional voice.

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
- Keep answers short (2–5 sentences) unless asked for detail. Be warm but precise. Never fabricate.
TXT;

$in = body_json();
$incoming = is_array($in['messages'] ?? null) ? $in['messages'] : [];

// Sanitize: keep last 12 valid turns, cap content length.
$messages = [];
foreach ($incoming as $m) {
    if (!is_array($m)) continue;
    $role = $m['role'] ?? '';
    $content = $m['content'] ?? '';
    if (($role === 'user' || $role === 'assistant') && is_string($content)) {
        $messages[] = ['role' => $role, 'content' => mb_substr($content, 0, 2000)];
    }
}
$messages = array_slice($messages, -12);
if (!$messages || $messages[count($messages) - 1]['role'] !== 'user') {
    json_out(400, ['error' => 'A user message is required.']);
}

$payload = json_encode([
    'model'      => $model,
    'max_tokens' => 1024,
    'system'     => $SYSTEM_PROMPT,
    'messages'   => $messages,
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_TIMEOUT        => 45,
    CURLOPT_HTTPHEADER     => [
        'x-api-key: ' . $apiKey,
        'anthropic-version: 2023-06-01',
        'content-type: application/json',
    ],
]);
$res = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$cErr = curl_error($ch);
curl_close($ch);

if ($res === false || $code !== 200) {
    error_log("Anthropic error HTTP $code: " . ($cErr ?: $res));
    json_out(502, ['error' => 'Upstream error from the AI service.']);
}

$data = json_decode($res, true);
$reply = '';
foreach (($data['content'] ?? []) as $b) {
    if (($b['type'] ?? '') === 'text') $reply .= $b['text'];
}
$reply = trim($reply);
if ($reply === '') $reply = "Sorry, I couldn't generate a response. Please email sales@toeshee.com.";

// Optional: log the exchange.
if (!empty($config['log_chats'])) {
    try {
        $pdo = db($config);
        $sid = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . ($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 64);
        $stmt = $pdo->prepare('INSERT INTO chat_logs (session_id, role, content) VALUES (?,?,?)');
        $stmt->execute([$sid, 'user', $messages[count($messages) - 1]['content']]);
        $stmt->execute([$sid, 'assistant', $reply]);
    } catch (Throwable $e) {
        error_log('chat log failed: ' . $e->getMessage());
    }
}

json_out(200, ['reply' => $reply]);
