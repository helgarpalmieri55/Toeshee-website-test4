<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

$config = load_config();

// Session cookie (same-origin). Hardened flags.
session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'secure'   => (($_SERVER['HTTPS'] ?? '') === 'on') || (($_SERVER['SERVER_PORT'] ?? '') == 443),
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

$action = $_GET['action'] ?? ($_POST['action'] ?? '');
$pdo = db($config);

function user_public(array $u): array {
    return [
        'name' => $u['name'],
        'email' => $u['email'],
        'company' => $u['company'],
        'created' => $u['created_at'] ?? null,
    ];
}

switch ($action) {

    case 'me':
        if (empty($_SESSION['uid'])) json_out(200, ['user' => null]);
        $stmt = $pdo->prepare('SELECT name,email,company,created_at FROM users WHERE id=?');
        $stmt->execute([$_SESSION['uid']]);
        $u = $stmt->fetch();
        json_out(200, ['user' => $u ? user_public($u) : null]);
        break;

    case 'register':
        require_post();
        $in = body_json();
        $name = trim((string)($in['name'] ?? ''));
        $company = trim((string)($in['company'] ?? ''));
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $pw = (string)($in['password'] ?? '');
        if ($name === '') json_out(400, ['error' => 'Please enter your name.']);
        if ($company === '') json_out(400, ['error' => 'Please enter your company name.']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(400, ['error' => 'Please enter a valid email address.']);
        if (strlen($pw) < 8) json_out(400, ['error' => 'Password must be at least 8 characters.']);

        $stmt = $pdo->prepare('SELECT id FROM users WHERE email=?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) json_out(409, ['error' => 'An account with that email already exists. Try logging in.']);

        $hash = password_hash($pw, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (name,company,email,password_hash) VALUES (?,?,?,?)');
        $stmt->execute([mb_substr($name, 0, 255), mb_substr($company, 0, 255), $email, $hash]);
        $newId = (int) $pdo->lastInsertId();
        session_regenerate_id(true);
        $_SESSION['uid'] = $newId;
        json_out(200, ['user' => ['name' => $name, 'email' => $email, 'company' => $company, 'created' => date('c')]]);
        break;

    case 'login':
        require_post();
        $in = body_json();
        $email = strtolower(trim((string)($in['email'] ?? '')));
        $pw = (string)($in['password'] ?? '');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_out(400, ['error' => 'Please enter a valid email address.']);
        $stmt = $pdo->prepare('SELECT id,name,email,company,password_hash,created_at FROM users WHERE email=?');
        $stmt->execute([$email]);
        $u = $stmt->fetch();
        if (!$u || !password_verify($pw, $u['password_hash'])) {
            json_out(401, ['error' => 'Incorrect email or password.']);
        }
        session_regenerate_id(true);
        $_SESSION['uid'] = (int) $u['id'];
        json_out(200, ['user' => user_public($u)]);
        break;

    case 'logout':
        require_post();
        $_SESSION = [];
        session_destroy();
        json_out(200, ['ok' => true]);
        break;

    default:
        json_out(400, ['error' => 'Unknown action.']);
}
