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

// ── GET — list all payments with member name ──────────────────
if ($method === 'GET') {
    $statut = $_GET['statut'] ?? null;
    $search = $_GET['q']      ?? null;

    $sql = "SELECT p.*, m.nom AS membre_nom
            FROM paiements p
            LEFT JOIN membres m ON m.id = p.membre_id
            WHERE 1=1";
    $params = [];

    if ($statut) {
        $sql    .= " AND p.statut = ?";
        $params[] = $statut;
    }
    if ($search) {
        $sql    .= " AND (m.nom LIKE ? OR p.type_transaction LIKE ?)";
        $like     = "%$search%";
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= " ORDER BY p.date_paiement DESC, p.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $paiements = $stmt->fetchAll();

    // Stats in same call
    $stats = $pdo->query(
        "SELECT
            COUNT(*)                                             AS total,
            COALESCE(SUM(montant_paye), 0)                      AS total_encaisse,
            SUM(statut = 'paye')                                AS nb_paye,
            SUM(statut = 'en_attente')                          AS nb_attente,
            SUM(statut = 'partiel')                             AS nb_partiel,
            COALESCE(SUM(montant_total - montant_paye), 0)      AS total_restant
         FROM paiements"
    )->fetch();

    echo json_encode([
        'success' => true,
        'data'    => $paiements,
        'stats'   => $stats,
    ]);
    exit;
}

// ── POST — create payment ─────────────────────────────────────
if ($method === 'POST') {
    $d = json_decode(file_get_contents("php://input"), true);

    if (empty($d['membre_id']) || empty($d['type_transaction']) || !isset($d['montant_total'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Champs requis manquants']);
        exit;
    }

    $montant_total = (float)$d['montant_total'];
    $montant_paye  = (float)($d['montant_paye'] ?? 0);

    // Auto-calculate status
    if ($montant_paye <= 0)                       $statut = 'en_attente';
    elseif ($montant_paye >= $montant_total)      $statut = 'paye';
    else                                           $statut = 'partiel';

    $stmt = $pdo->prepare(
        "INSERT INTO paiements
            (membre_id, type_transaction, montant_total, montant_paye, mode_paiement, statut, date_paiement, remarque)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        (int)$d['membre_id'],
        $d['type_transaction'],
        $montant_total,
        $montant_paye,
        $d['mode_paiement'] ?? 'especes',
        $statut,
        $d['date_paiement'] ?? date('Y-m-d'),
        $d['remarque'] ?? null,
    ]);

    echo json_encode(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'statut' => $statut]);
    exit;
}

// ── PUT — update payment ──────────────────────────────────────
if ($method === 'PUT') {
    $d  = json_decode(file_get_contents("php://input"), true);
    $id = isset($d['id']) ? (int)$d['id'] : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID manquant']);
        exit;
    }

    $montant_total = (float)$d['montant_total'];
    $montant_paye  = (float)($d['montant_paye'] ?? 0);

    if ($montant_paye <= 0)                  $statut = 'en_attente';
    elseif ($montant_paye >= $montant_total) $statut = 'paye';
    else                                      $statut = 'partiel';

    // Allow manual override
    if (!empty($d['statut']) && $d['statut'] === 'rembourse') $statut = 'rembourse';

    $pdo->prepare(
        "UPDATE paiements
         SET type_transaction=?, montant_total=?, montant_paye=?,
             mode_paiement=?, statut=?, date_paiement=?, remarque=?
         WHERE id=?"
    )->execute([
        $d['type_transaction'],
        $montant_total,
        $montant_paye,
        $d['mode_paiement'] ?? 'especes',
        $statut,
        $d['date_paiement'] ?? date('Y-m-d'),
        $d['remarque'] ?? null,
        $id,
    ]);

    echo json_encode(['success' => true, 'statut' => $statut]);
    exit;
}

// ── DELETE ────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $d  = json_decode(file_get_contents("php://input"), true);
    $id = isset($d['id']) ? (int)$d['id'] : null;

    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID manquant']);
        exit;
    }

    $pdo->prepare("DELETE FROM paiements WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}