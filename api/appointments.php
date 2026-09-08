<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

const OPENING_MINUTES = 420;
const CLOSING_MINUTES = 1200;
const SLOT_INTERVAL_MINUTES = 30;

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

function bookingDate(string $value): DateTimeImmutable
{
    $timezone = new DateTimeZone('America/Sao_Paulo');
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, $timezone);
    $errors = DateTimeImmutable::getLastErrors();

    if (!$date || ($errors !== false && ($errors['warning_count'] || $errors['error_count'])) || $date->format('Y-m-d') !== $value) {
        respond(['error' => 'Data inválida.'], 422);
    }
    if ($date->format('w') === '1') {
        respond(['error' => 'O studio não realiza atendimentos às segundas-feiras.'], 422);
    }
    if ($date < new DateTimeImmutable('today', $timezone)) {
        respond(['error' => 'Não é possível realizar agendamentos em datas passadas.'], 422);
    }
    return $date;
}

function durationToMinutes(string $duration): int
{
    preg_match('/(\d+)\s*hora/i', $duration, $hoursMatch);
    preg_match('/(\d+)\s*minuto/i', $duration, $minutesMatch);
    $minutes = ((int) ($hoursMatch[1] ?? 0) * 60) + (int) ($minutesMatch[1] ?? 0);

    if ($minutes <= 0 || $minutes > CLOSING_MINUTES - OPENING_MINUTES) {
        respond(['error' => 'A duração cadastrada para este serviço é inválida.'], 422);
    }
    return $minutes;
}

function timeToMinutes(string $time): int
{
    if (!preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $time)) {
        respond(['error' => 'Horário inválido.'], 422);
    }
    [$hours, $minutes] = array_map('intval', explode(':', $time));
    return $hours * 60 + $minutes;
}

function minutesToTime(int $minutes): string
{
    return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
}

function findActiveService(PDO $pdo, int $id, bool $lock = false): array
{
    $statement = $pdo->prepare('SELECT id, name, price, duration, deposit FROM services WHERE id = ? AND active = 1' . ($lock ? ' FOR UPDATE' : ''));
    $statement->execute([$id]);
    $service = $statement->fetch();

    if (!$service) {
        respond(['error' => 'O serviço selecionado não está disponível para agendamento.'], 422);
    }
    $service['duration_minutes'] = durationToMinutes($service['duration']);
    return $service;
}

function appointmentsForDate(PDO $pdo, string $date, bool $lock = false): array
{
    $statement = $pdo->prepare("SELECT start_time, end_time FROM appointments WHERE booking_date = ? AND status = 'confirmed'" . ($lock ? ' FOR UPDATE' : ''));
    $statement->execute([$date]);
    return $statement->fetchAll();
}

function overlapsExistingAppointment(int $start, int $end, array $appointments): bool
{
    foreach ($appointments as $appointment) {
        $existingStart = timeToMinutes(substr($appointment['start_time'], 0, 5));
        $existingEnd = timeToMinutes(substr($appointment['end_time'], 0, 5));
        if ($start < $existingEnd && $end > $existingStart) {
            return true;
        }
    }
    return false;
}

function serviceId(mixed $value): int
{
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if (!$id) {
        respond(['error' => 'Serviço inválido.'], 422);
    }
    return $id;
}

try {
    $pdo = database();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $date = bookingDate((string) ($_GET['date'] ?? ''));
        $service = findActiveService($pdo, serviceId($_GET['service_id'] ?? null));
        $appointments = appointmentsForDate($pdo, $date->format('Y-m-d'));
        $slots = [];

        for ($start = OPENING_MINUTES; $start + $service['duration_minutes'] <= CLOSING_MINUTES; $start += SLOT_INTERVAL_MINUTES) {
            $end = $start + $service['duration_minutes'];
            if (!overlapsExistingAppointment($start, $end, $appointments)) {
                $slots[] = minutesToTime($start);
            }
        }
        respond(['slots' => $slots]);
    }

    if ($method === 'POST') {
        $data = requestData();
        $name = trim((string) ($data['name'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        $notes = trim((string) ($data['notes'] ?? ''));
        $date = bookingDate((string) ($data['date'] ?? ''));
        $start = timeToMinutes((string) ($data['start_time'] ?? ''));

        if ($name === '' || mb_strlen($name) > 120 || $phone === '' || mb_strlen($phone) > 30 || mb_strlen($notes) > 2000) {
            respond(['error' => 'Verifique os dados informados para o agendamento.'], 422);
        }

        $pdo->beginTransaction();
        $service = findActiveService($pdo, serviceId($data['service_id'] ?? null), true);
        $end = $start + $service['duration_minutes'];

        if ($start < OPENING_MINUTES || $end > CLOSING_MINUTES) {
            $pdo->rollBack();
            respond(['error' => 'Este horário está fora do período de atendimento.'], 422);
        }

        $appointments = appointmentsForDate($pdo, $date->format('Y-m-d'), true);
        if (overlapsExistingAppointment($start, $end, $appointments)) {
            $pdo->rollBack();
            respond(['error' => 'Este horário acabou de ficar indisponível. Escolha outro horário.'], 409);
        }

        $statement = $pdo->prepare("INSERT INTO appointments (client_name, client_phone, service_id, service_name, booking_date, start_time, end_time, duration_minutes, service_price, deposit_amount, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')");
        $statement->execute([
            $name,
            $phone,
            $service['id'],
            $service['name'],
            $date->format('Y-m-d'),
            minutesToTime($start),
            minutesToTime($end),
            $service['duration_minutes'],
            $service['price'],
            $service['deposit'],
            $notes === '' ? null : $notes,
        ]);
        $pdo->commit();

        respond([
            'id' => (string) $pdo->lastInsertId(),
            'service_name' => $service['name'],
            'date' => $date->format('Y-m-d'),
            'start_time' => minutesToTime($start),
            'end_time' => minutesToTime($end),
            'price' => (float) $service['price'],
            'deposit' => $service['deposit'] === null ? null : (float) $service['deposit'],
        ], 201);
    }

    respond(['error' => 'Método não permitido.'], 405);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log($exception->getMessage());
    respond(['error' => 'Não foi possível processar o agendamento.'], 500);
}
