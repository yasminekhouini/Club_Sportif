<?php
// login_admin.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$email = isset($data['email']) ? trim($data['email']) : '';
$mdp = isset($data['mdp']) ? trim($data['mdp']) : '';

if (!$email || !$mdp) {
    echo json_encode(['success' => false, 'error' => 'Champs requis manquants']);
    exit;
}

try {
    $stmt = $pdo->prepare('SELECT * FROM admin WHERE email = ? AND mdp = ? LIMIT 1');
    $stmt->execute([$email, $mdp]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($admin) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Identifiants invalides']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}
