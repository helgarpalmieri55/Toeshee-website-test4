<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_post();

$config = load_config();
$pdo = db($config);
$in = body_json();

// Helper: scalar string from input
$s = function (string $k, int $max = 1000) use ($in): string {
    $v = $in[$k] ?? '';
    if (is_array($v)) $v = implode(', ', $v);
    return mb_substr(trim((string) $v), 0, $max);
};
// Helper: array → comma string (multi-select chips)
$arr = function (string $k) use ($in): string {
    $v = $in[$k] ?? [];
    if (is_string($v)) return mb_substr($v, 0, 1000);
    if (!is_array($v)) return '';
    return mb_substr(implode(', ', array_map('strval', $v)), 0, 1000);
};

// Minimal server-side validation of the required fields.
$name = $s('name', 255);
$email = $s('email', 255);
if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_out(400, ['error' => 'Name and a valid email are required.']);
}

$fields = [
    'name' => $name,
    'email' => $email,
    'phone' => $s('phone', 100),
    'company' => $s('company', 255),
    'job_title' => $s('job_title', 255),
    'website' => $s('website', 255),
    'country' => $s('country', 255),
    'company_type' => $s('company_type', 100),
    'company_size' => $s('company_size', 50),
    'annual_revenue' => $s('annual_revenue', 50),
    'support_model' => $s('support_model', 100),
    'support_team_size' => $s('support_team_size', 50),
    'support_volume' => $s('support_volume', 50),
    'helpdesk' => $s('helpdesk', 100),
    'audience' => $s('audience', 2000),
    'services' => $arr('services'),
    'industries' => $arr('industries'),
    'regions' => $arr('regions'),
    'channels' => $arr('channels'),
    'message' => $s('message', 5000),
    'preferred_date' => $s('preferred_date', 50),
    'time_window' => $s('time_window', 50),
    'time_zone' => $s('time_zone', 100),
    'attendees' => $s('attendees', 255),
    'marketing_opt_in' => !empty($in['marketing_opt_in']) ? 1 : 0,
];

try {
    $cols = implode(',', array_keys($fields));
    $ph = implode(',', array_fill(0, count($fields), '?'));
    $stmt = $pdo->prepare("INSERT INTO contact_submissions ($cols) VALUES ($ph)");
    $stmt->execute(array_values($fields));
} catch (Throwable $e) {
    error_log('contact insert failed: ' . $e->getMessage());
    json_out(500, ['error' => 'Could not save your request. Please email sales@toeshee.com.']);
}

// Optional email notification (best-effort; GoDaddy mail() can be unreliable).
$notify = $config['notify_email'] ?? '';
if ($notify !== '') {
    $body = "New Request Information submission:\n\n";
    foreach ($fields as $k => $v) $body .= str_pad($k, 18) . ": " . (is_int($v) ? $v : $v) . "\n";
    @mail($notify, 'New Toeshee request from ' . $name, $body,
        'From: website@' . ($_SERVER['HTTP_HOST'] ?? 'toeshee.com') . "\r\nReply-To: " . $email);
}

json_out(200, ['ok' => true]);
