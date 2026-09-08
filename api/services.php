<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

function respond(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requestData(): array
{
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        respond(['error' => 'Dados inválidos.'], 400);
    }
    return $data;
}

function serviceId(): int
{
    $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if (!$id) {
        respond(['error' => 'Identificador do serviço inválido.'], 400);
    }
    return $id;
}

function servicePayload(array $data): array
{
    $name = trim((string) ($data['name'] ?? ''));
    $duration = trim((string) ($data['duration'] ?? ''));
    $price = filter_var($data['value'] ?? null, FILTER_VALIDATE_FLOAT);
    $deposit = $data['deposit'] ?? null;
    $deposit = $deposit === null || $deposit === '' ? null : filter_var($deposit, FILTER_VALIDATE_FLOAT);

    if ($name === '' || mb_strlen($name) > 80 || $duration === '' || mb_strlen($duration) > 40 || $price === false || $price < 0 || $deposit === false || ($deposit !== null && $deposit < 0)) {
        respond(['error' => 'Verifique os campos obrigatórios e os valores informados.'], 422);
    }

    return [$name, $price, $duration, $deposit];
}

function formattedService(array $service): array
{
    return [
        'id' => (string) $service['id'],
        'name' => $service['name'],
        'value' => (float) $service['price'],
        'duration' => $service['duration'],
        'deposit' => $service['deposit'] === null ? null : (float) $service['deposit'],
        'active' => (bool) $service['active'],
    ];
}

function findService(PDO $pdo, int $id): array
{
    $statement = $pdo->prepare('SELECT id, name, price, duration, deposit, active FROM services WHERE id = ?');
    $statement->execute([$id]);
    $service = $statement->fetch();

    if (!$service) {
        respond(['error' => 'Serviço não encontrado.'], 404);
    }
    return formattedService($service);
}

try {
    $pdo = database();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $activeOnly = filter_input(INPUT_GET, 'active', FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) === true;
        $statement = $pdo->prepare('SELECT id, name, price, duration, deposit, active FROM services' . ($activeOnly ? ' WHERE active = 1' : '') . ' ORDER BY id DESC');
        $statement->execute();
        $services = array_map('formattedService', $statement->fetchAll());
        respond($services);
    }

    if ($method === 'POST') {
        [$name, $price, $duration, $deposit] = servicePayload(requestData());
        $statement = $pdo->prepare('INSERT INTO services (name, price, duration, deposit) VALUES (?, ?, ?, ?)');
        $statement->execute([$name, $price, $duration, $deposit]);
        respond(findService($pdo, (int) $pdo->lastInsertId()), 201);
    }

    if ($method === 'PUT') {
        $id = serviceId();
        [$name, $price, $duration, $deposit] = servicePayload(requestData());
        $statement = $pdo->prepare('UPDATE services SET name = ?, price = ?, duration = ?, deposit = ? WHERE id = ?');
        $statement->execute([$name, $price, $duration, $deposit, $id]);
        respond(findService($pdo, $id));
    }

    if ($method === 'PATCH') {
        $id = serviceId();
        $data = requestData();
        if (!array_key_exists('active', $data) || !is_bool($data['active'])) {
            respond(['error' => 'Status do serviço inválido.'], 422);
        }
        $statement = $pdo->prepare('UPDATE services SET active = ? WHERE id = ?');
        $statement->execute([(int) $data['active'], $id]);
        respond(findService($pdo, $id));
    }

    if ($method === 'DELETE') {
        $id = serviceId();
        $usage = $pdo->prepare('SELECT COUNT(*) FROM appointments WHERE service_id = ?');
        $usage->execute([$id]);
        if ((int) $usage->fetchColumn() > 0) {
            respond(['error' => 'Este serviço possui agendamentos e não pode ser excluído. Desative-o para removê-lo dos novos agendamentos.'], 409);
        }
        $statement = $pdo->prepare('DELETE FROM services WHERE id = ?');
        $statement->execute([$id]);
        if ($statement->rowCount() === 0) {
            respond(['error' => 'Serviço não encontrado.'], 404);
        }
        respond(['success' => true]);
    }

    respond(['error' => 'Método não permitido.'], 405);
} catch (PDOException $exception) {
    error_log($exception->getMessage());
    respond(['error' => 'Não foi possível conectar ao banco de dados.'], 500);
}
