<?php
declare(strict_types=1);

/* Shared bootstrap for all Toeshee API endpoints (GoDaddy PHP + MySQL). */

function json_out(int $status, array $data): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data);
    exit;
}

function body_json(): array {
    $raw = file_get_contents('php://input');
    $d = json_decode($raw ?: '', true);
    return is_array($d) ? $d : [];
}

function load_config(): array {
    $path = __DIR__ . '/config.php';
    if (!is_file($path)) {
        json_out(500, ['error' => 'Server not configured: copy api/config.example.php to api/config.php.']);
    }
    return require $path;
}

function db(array $config): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4";
        try {
            $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (Throwable $e) {
            error_log('DB connect failed: ' . $e->getMessage());
            json_out(500, ['error' => 'Database connection failed.']);
        }
    }
    return $pdo;
}

function require_post(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        json_out(405, ['error' => 'Method not allowed']);
    }
}
