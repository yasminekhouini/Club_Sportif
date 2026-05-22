<?php
error_reporting(E_ALL);
ini_set('display_errors', '0');
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

try {
    require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ── GET ──────────────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->query(
        "SELECT r.*, m.nom AS membre_nom
         FROM reservations r
         LEFT JOIN membres m ON m.id = r.membre_id
         ORDER BY r.date_reservation DESC, r.heure_debut ASC"
    );
    $reservations = $stmt->fetchAll();

    // Stats
    $stats = $pdo->query(
        "SELECT
            COUNT(*)                                                   AS total,
            SUM(date_reservation = CURDATE())                          AS aujourd_hui,
            SUM(date_reservation BETWEEN CURDATE()
                AND DATE_ADD(CURDATE(), INTERVAL 7 DAY))               AS cette_semaine,
            SUM(statut = 'confirmee')                                  AS confirmees,
            SUM(statut = 'en_attente')                                 AS en_attente
         FROM reservations"
    )->fetch();

    echo json_encode(['success' => true, 'data' => $reservations, 'stats' => $stats]);
    exit;
}

// ── POST ─────────────────────────────────────────────────────────
if ($method === 'POST') {
    $d = json_decode(file_get_contents("php://input"), true);

    if (empty($d['activite']) || empty($d['date_reservation']) || empty($d['heure_debut'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Activité, date et heure début requis']);
        exit;
    }

    $pdo->prepare(
        "INSERT INTO reservations (membre_id, activite, salle, date_reservation, heure_debut, heure_fin, statut)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )->execute([
        $d['membre_id'] ?: null,
        $d['activite'],
        $d['salle'] ?? null,
        $d['date_reservation'],
        $d['heure_debut'],
        $d['heure_fin'] ?? null,
        $d['statut'] ?? 'confirmee',
    ]);

    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId()]);
    exit;
}

// ── PUT ──────────────────────────────────────────────────────────
if ($method === 'PUT') {
    $d  = json_decode(file_get_contents("php://input"), true);
    $id = (int)($d['id'] ?? 0);

    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID manquant']); exit; }

    $pdo->prepare(
        "UPDATE reservations
         SET membre_id=?, activite=?, salle=?, date_reservation=?,
             heure_debut=?, heure_fin=?, statut=?
         WHERE id=?"
    )->execute([
        $d['membre_id'] ?: null,
        $d['activite'],
        $d['salle'] ?? null,
        $d['date_reservation'],
        $d['heure_debut'],
        $d['heure_fin'] ?? null,
        $d['statut'] ?? 'confirmee',
        $id,
    ]);

    echo json_encode(['success' => true]);
    exit;
}

// ── DELETE ───────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $d  = json_decode(file_get_contents("php://input"), true);
    $id = (int)($d['id'] ?? 0);

    if (!$id) { echo json_encode(['success' => false, 'error' => 'ID manquant']); exit; }

    $pdo->prepare("DELETE FROM reservations WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}