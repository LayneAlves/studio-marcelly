const http = require('node:http');
const { URL } = require('node:url');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');
const ejs = require('ejs');

try {
    for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
} catch {}

const port = Number(process.env.PORT || 3000);
const serverHost = process.env.SERVER_HOST || '127.0.0.1';
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'studio_marcelly',
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '-03:00',
});
const statuses = new Set(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']);
const scrypt = promisify(crypto.scrypt);
let smtpTransport;

const viewRoutes = {
    '/': 'index',
    '/index.html': 'index',
    '/index': 'index',
    '/curso.html': 'curso',
    '/curso': 'curso',
    '/minha-conta.html': 'minha-conta',
    '/minha-conta': 'minha-conta',
    '/admin.html': 'dashboard',
    '/admin': 'dashboard',
    '/admin/dashboard': 'dashboard',
    '/admin/dashboard.html': 'dashboard',
    '/dashboard.html': 'dashboard',
    '/dashboard': 'dashboard',
    '/agendamentos.html': 'agendamentos',
    '/agendamentos': 'agendamentos',
    '/servicos.html': 'servicos',
    '/servicos': 'servicos',
    '/configuracoes-agenda.html': 'configuracoes-agenda',
    '/configuracoes-agenda': 'configuracoes-agenda',
    '/faturamento.html': 'faturamento',
    '/faturamento': 'faturamento',
    '/manutencoes.html': 'manutencoes',
    '/manutencoes': 'manutencoes',
    '/relatorios.html': 'relatorios',
    '/relatorios': 'relatorios',
    '/administradores.html': 'administradores',
    '/administradores': 'administradores',
    '/clientes.html': 'clientes',
    '/clientes': 'clientes',
};
const viewOptions = {
    index: {
        title: 'Studio Marcelly Freitas — Extensão de Cílios',
        description: 'Studio Marcelly Freitas — estúdio especializado em extensão de cílios. Agende seu horário.',
        layout: 'public',
        pageStyles: [],
    },
    curso: {
        title: 'Curso de Lash Design Iniciante — Studio Marcelly Freitas',
        description: 'Curso de Lash Design Iniciante do Studio Marcelly Freitas.',
        layout: 'public',
        pageStyles: ['css/curso.css'],
    },
    'minha-conta': { title: 'Minha Conta | Studio Marcelly Freitas', description: '', layout: 'public', pageStyles: ['css/minha-conta.css'] },
    dashboard: {
        title: 'Painel Administrativo | Studio Marcelly Freitas',
        description: 'Painel administrativo do Studio Marcelly Freitas.',
        layout: 'admin',
        adminPage: 'dashboard',
        pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/dashboard.css?v=20260926-module-split'],
    },
    agendamentos: { title: 'Agendamentos | Studio Marcelly Freitas', description: '', layout: 'admin', adminPage: 'appointments', pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/appointments.css?v=20260926-module-split'] },
    servicos: { title: 'Serviços | Studio Marcelly Freitas', description: '', layout: 'admin', adminPage: 'services', pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/services.css?v=20260926-module-split'] },
    'configuracoes-agenda': { title: 'Configurações da Agenda | Studio Marcelly Freitas', description: '', layout: 'admin', adminPage: 'schedule-settings', pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/schedule-settings.css?v=20260926-module-split'] },
    faturamento: { title: 'Faturamento | Studio Marcelly Freitas', description: '', layout: 'admin', adminPage: 'billing', pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/billing.css?v=20260926-module-split'] },
    manutencoes: { title: 'Manutenções | Studio Marcelly Freitas', description: '', layout: 'admin', adminPage: 'maintenances', pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/maintenances.css?v=20260926-module-split'] },
    relatorios: { title: 'Relatórios | Studio Marcelly Freitas', description: '', layout: 'admin', adminPage: 'reports', pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/reports.css?v=20260926-module-split'] },
    administradores: {
        title: 'Administradores | Studio Marcelly Freitas',
        description: '',
        layout: 'admin',
        adminPage: 'administrators',
        ownerOnly: true,
        pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/administrators.css?v=20260927-owner-management'],
    },
    clientes: {
        title: 'Clientes | Studio Marcelly Freitas',
        description: '',
        layout: 'admin',
        adminPage: 'clients',
        pageStyles: ['css/admin-shared.css?v=20260926-header-flow', 'css/clientes.css?v=20260926-module-split'],
    },
    forbidden: {
        title: 'Acesso não autorizado | Studio Marcelly Freitas',
        description: '',
        layout: 'public',
        pageStyles: ['css/access-denied.css'],
    },
};
const assetTypes = {
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
};

function sendHtml(response, status, html, headers = {}) {
    response.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
    response.end(html);
}
async function renderView(response, name, user = null, status = 200) {
    const html = await ejs.renderFile(path.join(__dirname, 'views', `${name}.ejs`), { ...viewOptions[name], user });
    sendHtml(response, status, html);
}
async function serveAsset(response, requestPath) {
    const extension = path.extname(requestPath).toLowerCase();
    if (!assetTypes[extension]) return false;
    const relativePath = decodeURIComponent(requestPath).replace(/^[/\\]+/, '');
    const publicDirectory = path.resolve(__dirname, 'public');
    const absolutePath = path.resolve(publicDirectory, relativePath);
    const publicPrefix = `${publicDirectory}${path.sep}`;
    if (!absolutePath.startsWith(publicPrefix)) return false;
    try {
        const info = await fs.promises.stat(absolutePath);
        if (!info.isFile()) return false;
        response.writeHead(200, { 'Content-Type': assetTypes[extension] });
        fs.createReadStream(absolutePath).pipe(response);
        return true;
    } catch {
        return false;
    }
}

function send(response, status, data, headers = {}) {
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        ...headers,
    });
    response.end(JSON.stringify(data));
}
function fail(status, error, fields = null) {
    const result = new Error(error);
    result.status = status;
    if (fields) result.fields = fields;
    throw result;
}
function minutes(time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) fail(422, 'Horário inválido.');
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
}
function time(value) {
    return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}
function phoneKey(value) {
    return String(value || '').replace(/\D/g, '');
}
async function passwordHash(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64);
    return `${salt}:${key.toString('hex')}`;
}
async function passwordMatches(password, stored) {
    const [salt, hash] = String(stored || '').split(':');
    if (!salt || !hash) return false;
    const key = await scrypt(password, salt, 64);
    return crypto.timingSafeEqual(key, Buffer.from(hash, 'hex'));
}
async function createSession(clientId) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await pool.execute('INSERT INTO client_sessions (client_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 30 DAY))', [
        clientId,
        tokenHash,
    ]);
    return token;
}
function readCookie(request, name) {
    const cookies = String(request.headers.cookie || '').split(';');
    const entry = cookies.find((item) => item.trim().startsWith(`${name}=`));
    return entry ? decodeURIComponent(entry.slice(entry.indexOf('=') + 1).trim()) : '';
}

function sessionToken(request) {
    const bearer = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
    return bearer || readCookie(request, 'smf_session');
}

function sessionCookie(token, maxAge = 60 * 60 * 24 * 30) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `smf_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function accountPayload(client) {
    return {
        id: String(client.id),
        name: client.name,
        phone: client.phone,
        email: client.email,
        role: client.role || 'user',
        isOwner: Boolean(client.isOwner),
    };
}

async function authenticatedClient(request) {
    const token = sessionToken(request);
    if (!token) fail(401, 'Faça login para acessar sua conta.');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await pool.execute(
        "SELECT c.id,c.name,c.phone,c.email,COALESCE(c.role,'user') AS role,COALESCE(c.is_owner,0) AS isOwner FROM client_sessions s JOIN clients c ON c.id=s.client_id WHERE s.token_hash=? AND s.expires_at>NOW()",
        [tokenHash],
    );
    if (!rows[0]) fail(401, 'Sua sessão expirou. Faça login novamente.');
    return rows[0];
}
async function optionalAuthenticatedClient(request) {
    if (!sessionToken(request)) return null;
    try {
        return await authenticatedClient(request);
    } catch (error) {
        if (error.status === 401) return null;
        throw error;
    }
}

async function requireAuth(request) {
    return authenticatedClient(request);
}

async function requireMaster(request) {
    const client = await requireAuth(request);
    if (client.role !== 'master') fail(403, 'Você não possui permissão para acessar esta área.');
    return client;
}
async function requireOwner(request) {
    const client = await requireMaster(request);
    if (!client.isOwner) fail(403, 'Somente a proprietária pode gerenciar administradoras.');
    return client;
}

function redirectToLogin(response) {
    response.writeHead(302, { Location: '/index.html?auth=account' });
    response.end();
}

function duration(value) {
    const hours = Number((value.match(/(\d+)\s*hora/i) || [])[1] || 0);
    const mins = Number((value.match(/(\d+)\s*minuto/i) || [])[1] || 0);
    const total = hours * 60 + mins;
    if (!total) fail(422, 'A duração do serviço é inválida.');
    return total;
}
function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T12:00:00`).valueOf())) fail(422, 'Data inválida.');
    return value;
}
function overlap(start, end, periods) {
    return periods.some((item) => start < minutes(item.end_time.slice(0, 5)) && end > minutes(item.start_time.slice(0, 5)));
}
async function body(request) {
    let raw = '';
    for await (const chunk of request) raw += chunk;
    try {
        return JSON.parse(raw || '{}');
    } catch {
        fail(400, 'Dados inválidos.');
    }
}
function servicePayload(data) {
    const name = String(data.name || '').trim();
    const durationValue = String(data.duration || '').trim();
    const value = Number(data.value);
    const deposit = data.deposit === '' || data.deposit == null ? null : Number(data.deposit);
    const maintenanceDays = data.maintenance_days === '' || data.maintenance_days == null ? null : Number(data.maintenance_days);

    if (!name || name.length > 80 || !durationValue || durationValue.length > 40 || !Number.isFinite(value) || value < 0 || (deposit !== null && (!Number.isFinite(deposit) || deposit < 0))) {
        fail(422, 'Verifique os campos obrigatórios e os valores informados.');
    }
    if (maintenanceDays !== null && (!Number.isInteger(maintenanceDays) || maintenanceDays < 1 || maintenanceDays > 365)) {
        fail(422, 'Informe uma manutenção entre 1 e 365 dias ou deixe o campo vazio.');
    }
    return { name, duration: durationValue, value, deposit, maintenanceDays };
}
function formatService(row) {
    return {
        ...row,
        id: String(row.id),
        value: Number(row.value),
        deposit: row.deposit == null ? null : Number(row.deposit),
        maintenance_days: row.maintenance_days == null ? null : Number(row.maintenance_days),
        active: Boolean(row.active),
    };
}
function formatMaintenance(row) {
    return {
        ...row,
        id: String(row.id),
        client_id: String(row.client_id),
        completed_appointment_id: String(row.completed_appointment_id),
        service_id: String(row.service_id),
        maintenance_days: row.maintenance_days == null ? null : Number(row.maintenance_days),
    };
}
async function service(connection, id, lock = false) {
    const [rows] = await connection.execute(
        `SELECT id, name, price, duration, deposit FROM services WHERE id = ? AND active = 1${lock ? ' FOR UPDATE' : ''}`,
        [Number(id)],
    );
    if (!rows[0]) fail(422, 'O serviço selecionado está desativado ou não existe.');
    return { ...rows[0], minutes: duration(rows[0].duration) };
}
async function settings(connection) {
    const [rows] = await connection.query('SELECT opening_minutes, closing_minutes, monday_closed FROM business_settings WHERE id = 1');
    return rows[0] || { opening_minutes: 420, closing_minutes: 1200, monday_closed: 1 };
}
async function businessHours(connection, dayOfWeek) {
    const [rows] = await connection.execute(
        'SELECT is_active,opening_minutes,closing_minutes FROM business_hours WHERE day_of_week=?',
        [dayOfWeek],
    );
    if (rows[0]) return { ...rows[0], is_active: Boolean(rows[0].is_active) };

    const legacy = await settings(connection);
    return {
        is_active: !(dayOfWeek === 1 && legacy.monday_closed),
        opening_minutes: Number(legacy.opening_minutes),
        closing_minutes: Number(legacy.closing_minutes),
    };
}
async function scheduleSettings(connection) {
    const [rows] = await connection.query('SELECT day_of_week,is_active,opening_minutes,closing_minutes FROM business_hours ORDER BY day_of_week');
    const saved = new Map(rows.map((row) => [Number(row.day_of_week), row]));
    const legacy = rows.length === 7 ? null : await settings(connection);

    return {
        days: Array.from({ length: 7 }, (_, dayOfWeek) => {
            const row = saved.get(dayOfWeek);
            return {
                day_of_week: dayOfWeek,
                is_active: row ? Boolean(row.is_active) : !(dayOfWeek === 1 && legacy.monday_closed),
                opening_time: time(Number(row?.opening_minutes ?? legacy?.opening_minutes ?? 420)),
                closing_time: time(Number(row?.closing_minutes ?? legacy?.closing_minutes ?? 1200)),
            };
        }),
    };
}
async function periods(connection, bookingDate, excludeId = 0, lock = false) {
    const [appointments] = await connection.execute(
        `SELECT start_time, end_time FROM appointments WHERE booking_date = ? AND status NOT IN ('cancelled','no_show') AND id <> ?${lock ? ' FOR UPDATE' : ''}`,
        [bookingDate, Number(excludeId)],
    );
    const [blocks] = await connection.execute('SELECT start_time, end_time FROM schedule_blocks WHERE block_date = ?', [bookingDate]);
    return [...appointments, ...blocks];
}
async function availableSlots(connection, bookingDate, durationMinutes, excludeId = 0) {
    const dayOfWeek = new Date(`${bookingDate}T12:00:00`).getDay();
    const hours = await businessHours(connection, dayOfWeek);
    if (!hours.is_active) return [];

    const used = await periods(connection, bookingDate, excludeId);
    const slots = [];
    for (let start = Number(hours.opening_minutes); start + durationMinutes <= Number(hours.closing_minutes); start += 30)
        if (!overlap(start, start + durationMinutes, used)) slots.push(time(start));
    return slots;
}
async function validateSlot(connection, bookingDate, start, durationMinutes, excludeId = 0, override = false, lock = false) {
    const day = new Date(`${bookingDate}T12:00:00`).getDay();
    const hours = await businessHours(connection, day);
    const end = start + durationMinutes;
    if (!override && !hours.is_active) fail(422, 'O studio não atende neste dia.');
    if (!override && (start < Number(hours.opening_minutes) || end > Number(hours.closing_minutes)))
        fail(422, 'Este horário está fora do período de atendimento.');
    if (overlap(start, end, await periods(connection, bookingDate, excludeId, lock)))
        fail(409, 'Este horário acabou de ficar indisponível. Escolha outro horário.');
    return end;
}
function format(row) {
    return {
        ...row,
        id: String(row.id),
        client_id: row.client_id == null ? null : String(row.client_id),
        service_id: String(row.service_id),
        duration_minutes: Number(row.duration_minutes),
        price: Number(row.price),
        deposit: row.deposit == null ? null : Number(row.deposit),
        paid: Number(row.paid || 0),
    };
}
async function appointment(connection, id) {
    const [rows] = await connection.execute(
        `SELECT a.id,a.client_id,a.client_name,a.client_phone AS phone,c.email,a.service_id,a.service_name,DATE_FORMAT(a.booking_date,'%Y-%m-%d') AS date,TIME_FORMAT(a.start_time,'%H:%i') AS start_time,TIME_FORMAT(a.end_time,'%H:%i') AS end_time,a.duration_minutes,a.service_price AS price,a.deposit_amount AS deposit,a.paid_amount AS paid,a.notes,a.status,a.cancellation_reason,a.completed_at,a.created_at FROM appointments a LEFT JOIN clients c ON c.id=a.client_id WHERE a.id=?`,
        [Number(id)],
    );
    if (!rows[0]) fail(404, 'Agendamento não encontrado.');
    return format(rows[0]);
}
function calendarDate(value) {
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}
function billingRange(query) {
    const period = query.get('period') || 'month';
    const today = new Date();
    let start;
    let end;

    if (period === 'today') {
        start = calendarDate(today);
        end = start;
    } else if (period === 'week') {
        const firstDay = new Date(today);
        firstDay.setHours(0, 0, 0, 0);
        firstDay.setDate(firstDay.getDate() - firstDay.getDay());
        const lastDay = new Date(firstDay);
        lastDay.setDate(firstDay.getDate() + 6);
        start = calendarDate(firstDay);
        end = calendarDate(lastDay);
    } else if (period === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        start = calendarDate(firstDay);
        end = calendarDate(lastDay);
    } else if (period === 'custom') {
        start = date(query.get('start'));
        end = date(query.get('end'));
        if (start > end) fail(422, 'A data inicial deve ser anterior ou igual à data final.');
    } else {
        fail(422, 'Período de faturamento inválido.');
    }

    return { period, start, end };
}
function money(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
function formatBillingRecord(row) {
    const price = money(row.price);
    const paid = money(row.paid || 0);
    const remaining = money(Math.max(price - paid, 0));
    return {
        id: String(row.id),
        client_id: row.client_id == null ? null : String(row.client_id),
        client_name: row.client_name,
        service_name: row.service_name,
        date: row.date,
        price,
        deposit: row.deposit == null ? null : money(row.deposit),
        paid,
        remaining,
        payment_status: remaining === 0 ? 'paid' : 'pending',
    };
}
function billingSummary(records) {
    const totals = records.reduce(
        (summary, record) => ({
            forecasted: summary.forecasted + record.price,
            received: summary.received + record.paid,
            pending: summary.pending + record.remaining,
            paid_count: summary.paid_count + (record.payment_status === 'paid' ? 1 : 0),
            pending_count: summary.pending_count + (record.payment_status === 'pending' ? 1 : 0),
        }),
        { forecasted: 0, received: 0, pending: 0, paid_count: 0, pending_count: 0 },
    );
    return {
        ...totals,
        forecasted: money(totals.forecasted),
        received: money(totals.received),
        pending: money(totals.pending),
    };
}
async function billingRecords(connection, range) {
    const [rows] = await connection.execute(
        `SELECT a.id,a.client_id,a.client_name,a.service_name,DATE_FORMAT(a.booking_date,'%Y-%m-%d') AS date,
            a.service_price AS price,a.deposit_amount AS deposit,
            CASE WHEN a.payment_recorded_manually=1 THEN a.paid_amount ELSE 0 END AS paid
        FROM appointments a
        WHERE a.booking_date BETWEEN ? AND ? AND a.status NOT IN ('cancelled','no_show')
        ORDER BY a.booking_date DESC,a.start_time DESC`,
        [range.start, range.end],
    );
    return rows.map(formatBillingRecord);
}

function formatReportRecord(row) {
    return { ...formatBillingRecord(row), status: row.status };
}

async function reportData(connection, query) {
    const range = billingRange(query);
    const [statusResult, servicesResult, clientsResult, recordsResult, financialRecords] = await Promise.all([
        connection.execute(
            'SELECT status,COUNT(*) AS total FROM appointments WHERE booking_date BETWEEN ? AND ? GROUP BY status',
            [range.start, range.end],
        ),
        connection.execute(
            `SELECT service_id,service_name,COUNT(*) AS total
            FROM appointments
            WHERE booking_date BETWEEN ? AND ? AND status='completed'
            GROUP BY service_id,service_name
            ORDER BY total DESC,service_name ASC`,
            [range.start, range.end],
        ),
        connection.execute(
            `SELECT
                COUNT(DISTINCT CASE WHEN a.status='completed' THEN a.client_id END) AS attended,
                COUNT(DISTINCT CASE
                    WHEN a.status='completed' AND (
                        DATE(c.created_at) BETWEEN ? AND ? OR NOT EXISTS (
                            SELECT 1 FROM appointments previous
                            WHERE previous.client_id=a.client_id
                                AND previous.status='completed'
                                AND previous.booking_date < ?
                        )
                    ) THEN a.client_id END
                ) AS new_clients,
                COUNT(DISTINCT CASE
                    WHEN a.status='completed'
                        AND DATE(c.created_at) < ?
                        AND EXISTS (
                            SELECT 1 FROM appointments previous
                            WHERE previous.client_id=a.client_id
                                AND previous.status='completed'
                                AND previous.booking_date < ?
                        )
                    THEN a.client_id END
                ) AS recurring_clients
            FROM appointments a
            LEFT JOIN clients c ON c.id=a.client_id
            WHERE a.booking_date BETWEEN ? AND ?`,
            [range.start, range.end, range.start, range.start, range.start, range.start, range.end],
        ),
        connection.execute(
            `SELECT a.id,a.client_id,a.client_name,a.service_name,DATE_FORMAT(a.booking_date,'%Y-%m-%d') AS date,
                a.service_price AS price,a.deposit_amount AS deposit,a.status,
                CASE WHEN a.payment_recorded_manually=1 THEN a.paid_amount ELSE 0 END AS paid
            FROM appointments a
            WHERE a.booking_date BETWEEN ? AND ?
            ORDER BY a.booking_date DESC,a.start_time DESC`,
            [range.start, range.end],
        ),
        billingRecords(connection, range),
    ]);

    const byStatus = Object.fromEntries(statusResult[0].map((row) => [row.status, Number(row.total)]));
    const statusesSummary = {
        pending: byStatus.pending || 0,
        confirmed: byStatus.confirmed || 0,
        completed: byStatus.completed || 0,
        cancelled: byStatus.cancelled || 0,
        no_show: byStatus.no_show || 0,
    };
    const clientSummary = clientsResult[0][0] || {};
    const records = recordsResult[0].map(formatReportRecord);

    return {
        ...range,
        appointments: {
            total: records.length,
            completed: statusesSummary.completed,
            cancelled: statusesSummary.cancelled,
            no_show: statusesSummary.no_show,
        },
        statuses: statusesSummary,
        financial: billingSummary(financialRecords),
        services: servicesResult[0].map((row) => ({
            service_id: String(row.service_id),
            service_name: row.service_name,
            total: Number(row.total),
        })),
        clients: {
            attended: Number(clientSummary.attended || 0),
            new: Number(clientSummary.new_clients || 0),
            recurring: Number(clientSummary.recurring_clients || 0),
        },
        records,
    };
}

async function dashboardData(connection) {
    const monthRange = billingRange(new URLSearchParams({ period: 'month' }));
    const [todayRows, clientRows, serviceRows, upcomingRows, financialRecords] = await Promise.all([
        connection.query("SELECT COUNT(*) AS total FROM appointments WHERE booking_date=CURDATE() AND status NOT IN ('cancelled','no_show')"),
        connection.query('SELECT COUNT(*) AS total FROM clients'),
        connection.query('SELECT COUNT(*) AS total FROM services WHERE active=1'),
        connection.query(
            `SELECT a.id,a.client_id,a.client_name,a.client_phone AS phone,a.service_id,a.service_name,
                DATE_FORMAT(a.booking_date,'%Y-%m-%d') AS date,
                TIME_FORMAT(a.start_time,'%H:%i') AS start_time,TIME_FORMAT(a.end_time,'%H:%i') AS end_time,
                a.duration_minutes,a.service_price AS price,a.deposit_amount AS deposit,a.paid_amount AS paid,a.status,a.created_at
            FROM appointments a
            WHERE (a.booking_date>CURDATE() OR (a.booking_date=CURDATE() AND a.start_time>=CURTIME()))
                AND a.status NOT IN ('cancelled','completed','no_show')
            ORDER BY a.booking_date ASC,a.start_time ASC
            LIMIT 5`,
        ),
        billingRecords(connection, monthRange),
    ]);
    const financialSummary = billingSummary(financialRecords);

    return {
        summary: {
            appointments_today: Number(todayRows[0][0]?.total || 0),
            billing_month: financialSummary.received,
            clients: Number(clientRows[0][0]?.total || 0),
            active_services: Number(serviceRows[0][0]?.total || 0),
        },
        financial_summary: financialSummary,
        upcoming: upcomingRows[0].map(format),
    };
}
async function createMaintenanceRecord(connection, completedAppointment) {
    if (!completedAppointment.client_id) return;
    const [services] = await connection.execute('SELECT maintenance_days FROM services WHERE id=?', [completedAppointment.service_id]);
    const maintenanceDays = Number(services[0]?.maintenance_days);
    if (!Number.isInteger(maintenanceDays) || maintenanceDays < 1) return;

    await connection.execute(
        `INSERT INTO maintenance_records (client_id,completed_appointment_id,service_id,service_name,maintenance_days,last_appointment_date,maintenance_date,status)
        VALUES (?,?,?,?,?,?,DATE_ADD(?, INTERVAL ? DAY),'awaiting')
        ON DUPLICATE KEY UPDATE updated_at=updated_at`,
        [
            completedAppointment.client_id,
            completedAppointment.id,
            completedAppointment.service_id,
            completedAppointment.service_name,
            maintenanceDays,
            completedAppointment.date,
            completedAppointment.date,
            maintenanceDays,
        ],
    );
}
const maintenanceSelect = `
    SELECT m.id,m.client_id,m.completed_appointment_id,m.service_id,m.service_name,
        DATE_FORMAT(m.last_appointment_date,'%Y-%m-%d') AS last_appointment_date,
        DATE_FORMAT(m.maintenance_date,'%Y-%m-%d') AS maintenance_date,
        m.status AS stored_status,m.reminder_sent_at,m.cancelled_at,m.created_at,
        c.name AS client_name,c.phone,c.email,m.maintenance_days,
        CASE
            WHEN m.status='cancelled' THEN 'cancelled'
            WHEN EXISTS (
                SELECT 1 FROM appointments future_appointment
                WHERE future_appointment.client_id=m.client_id
                    AND future_appointment.id<>m.completed_appointment_id
                    AND (future_appointment.booking_date>CURDATE() OR (future_appointment.booking_date=CURDATE() AND future_appointment.start_time>=CURTIME()))
                    AND future_appointment.status NOT IN ('cancelled','completed','no_show')
            ) THEN 'rescheduled'
            WHEN m.reminder_sent_at IS NOT NULL THEN 'reminder_sent'
            ELSE 'awaiting'
        END AS status
    FROM maintenance_records m
    JOIN clients c ON c.id=m.client_id`;
async function maintenanceRecord(connection, id) {
    const [rows] = await connection.execute(`${maintenanceSelect} WHERE m.id=?`, [Number(id)]);
    if (!rows[0]) fail(404, 'Manutenção não encontrada.');
    return formatMaintenance(rows[0]);
}
function smtpIsConfigured() {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}
function getSmtpTransport() {
    if (!smtpTransport)
        smtpTransport = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
    return smtpTransport;
}
async function sendSmtpEmail(to, subject, text) {
    return getSmtpTransport().sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
function resendIsConfigured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATIONS_FROM_EMAIL);
}
async function sendTransactionalEmail(to, subject, text) {
    if (smtpIsConfigured()) return sendSmtpEmail(to, subject, text);
    if (resendIsConfigured()) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: process.env.NOTIFICATIONS_FROM_EMAIL, to: [to], subject, text }),
        });
        if (!response.ok) throw new Error('O serviço de e-mail não aceitou o envio.');
        return;
    }
    throw new Error('O envio de e-mail não está configurado.');
}
function publicAppUrl(request) {
    return String(process.env.APP_URL || `http://${request.headers.host || `localhost:${port}`}`).replace(/\/+$/, '');
}
function appointmentNotificationText(created) {
    const day = String(created.date).split('-').reverse().join('/');
    return `Novo agendamento\nNome: ${created.client_name}\nTelefone: ${created.phone}\nServiço: ${created.service_name}\nDia e horário: ${day} às ${created.start_time}`;
}
async function notifyAdministrator(created) {
    const text = appointmentNotificationText(created);
    const subject = 'Novo agendamento - Studio Marcelly Freitas';
    const jobs = [];
    if (smtpIsConfigured() && process.env.ADMIN_EMAIL) jobs.push(sendSmtpEmail(process.env.ADMIN_EMAIL, subject, text));
    else if (resendIsConfigured() && process.env.ADMIN_EMAIL)
        jobs.push(
            fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ from: process.env.NOTIFICATIONS_FROM_EMAIL, to: [process.env.ADMIN_EMAIL], subject, text }),
            }),
        );
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ADMIN_PHONE)
        jobs.push(
            fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: process.env.WHATSAPP_ADMIN_PHONE,
                    type: 'text',
                    text: { body: text },
                }),
            }),
        );
    const results = await Promise.allSettled(jobs);
    if (results.some((result) => result.status === 'rejected')) console.error('Falha ao enviar notificação de novo agendamento.');
}

function scheduleSettingsPayload(data) {
    if (!Array.isArray(data.days) || data.days.length !== 7) fail(422, 'Informe os horários dos sete dias da semana.');
    const days = new Map();

    data.days.forEach((item) => {
        const dayOfWeek = Number(item.day_of_week);
        if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6 || days.has(dayOfWeek))
            fail(422, 'Os dias da semana informados são inválidos.');
        const openingMinutes = minutes(String(item.opening_time || ''));
        const closingMinutes = minutes(String(item.closing_time || ''));
        if (openingMinutes >= closingMinutes) fail(422, 'O horário de término precisa ser posterior ao horário de início.');
        days.set(dayOfWeek, {
            dayOfWeek,
            isActive: Boolean(item.is_active),
            openingMinutes,
            closingMinutes,
        });
    });

    if (days.size !== 7) fail(422, 'Informe os horários dos sete dias da semana.');
    return [...days.values()].sort((first, second) => first.dayOfWeek - second.dayOfWeek);
}

function formatScheduleBlock(row) {
    return {
        ...row,
        id: String(row.id),
        start_time: String(row.start_time).slice(0, 5),
        end_time: String(row.end_time).slice(0, 5),
    };
}

async function renderRoute(request, response, name) {
    const options = viewOptions[name];
    if (options.layout === 'admin') {
        try {
            const user = options.ownerOnly ? await requireOwner(request) : await requireMaster(request);
            return renderView(response, name, accountPayload(user));
        } catch (error) {
            if (error.status === 401) return redirectToLogin(response);
            if (error.status === 403) return renderView(response, 'forbidden', null, 403);
            throw error;
        }
    }

    if (name === 'minha-conta') {
        try {
            const user = await requireAuth(request);
            return renderView(response, name, accountPayload(user));
        } catch (error) {
            if (error.status === 401) return redirectToLogin(response);
            throw error;
        }
    }

    const user = await optionalAuthenticatedClient(request);
    return renderView(response, name, user ? accountPayload(user) : null);
}

function isMasterApi(path, query) {
    if (path.startsWith('/api/admin/')) return true;
    if (path === '/api/billing' || path === '/api/maintenances' || path === '/api/reports') return true;
    if (path === '/api/clients' || /^\/api\/clients\/\d+$/.test(path)) return true;
    return path === '/api/appointments' && !query.has('availability');
}

async function handler(request, response) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const path = url.pathname;
    const query = url.searchParams;
    if (request.method === 'GET' && viewRoutes[path]) return renderRoute(request, response, viewRoutes[path]);
    if (request.method === 'GET' && (await serveAsset(response, path))) return;
    if (request.method === 'OPTIONS') return send(response, 204, {});
    if (isMasterApi(path, query)) await requireMaster(request);
    if (path === '/api/admin/schedule-settings' || path === '/api/schedule-settings') {
        if (request.method === 'GET') return send(response, 200, await scheduleSettings(pool));
        if (path === '/api/schedule-settings') return fail(405, 'Método não permitido.');
        if (request.method === 'PUT') {
            const days = scheduleSettingsPayload(await body(request));
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                for (const day of days) {
                    await connection.execute(
                        `INSERT INTO business_hours (day_of_week,is_active,opening_minutes,closing_minutes)
                        VALUES (?,?,?,?)
                        ON DUPLICATE KEY UPDATE is_active=VALUES(is_active),opening_minutes=VALUES(opening_minutes),closing_minutes=VALUES(closing_minutes)`,
                        [day.dayOfWeek, day.isActive ? 1 : 0, day.openingMinutes, day.closingMinutes],
                    );
                }
                await connection.commit();
                return send(response, 200, await scheduleSettings(pool));
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }
        return fail(405, 'Método não permitido.');
    }
    if (path === '/api/admin/schedule-blocks') {
        const id = Number(query.get('id'));
        if (request.method === 'GET') {
            const [rows] = await pool.query(
                `SELECT id,DATE_FORMAT(block_date,'%Y-%m-%d') AS block_date,TIME_FORMAT(start_time,'%H:%i') AS start_time,
                TIME_FORMAT(end_time,'%H:%i') AS end_time,reason,created_at
                FROM schedule_blocks WHERE block_date>=CURDATE() ORDER BY block_date,start_time`,
            );
            return send(response, 200, rows.map(formatScheduleBlock));
        }
        if (request.method === 'POST') {
            const data = await body(request);
            const blockDate = date(data.block_date);
            if (blockDate < new Date().toISOString().slice(0, 10)) fail(422, 'Escolha uma data atual ou futura para o bloqueio.');
            const start = minutes(String(data.start_time || ''));
            const end = minutes(String(data.end_time || ''));
            const reason = String(data.reason || '').trim();
            if (start >= end) fail(422, 'O horário final deve ser posterior ao horário inicial.');
            if (reason.length > 255) fail(422, 'A descrição do bloqueio pode ter no máximo 255 caracteres.');

            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                const [appointments] = await connection.execute(
                    `SELECT start_time,end_time FROM appointments
                    WHERE booking_date=? AND status NOT IN ('cancelled','no_show') FOR UPDATE`,
                    [blockDate],
                );
                const [blocks] = await connection.execute(
                    'SELECT start_time,end_time FROM schedule_blocks WHERE block_date=? FOR UPDATE',
                    [blockDate],
                );
                if (overlap(start, end, appointments)) fail(409, 'Existe um agendamento neste intervalo. Escolha outro horário.');
                if (overlap(start, end, blocks)) fail(409, 'Este intervalo já possui um bloqueio manual.');
                const [result] = await connection.execute(
                    'INSERT INTO schedule_blocks (block_date,start_time,end_time,reason) VALUES (?,?,?,?)',
                    [blockDate, time(start), time(end), reason || null],
                );
                const [rows] = await connection.execute(
                    `SELECT id,DATE_FORMAT(block_date,'%Y-%m-%d') AS block_date,TIME_FORMAT(start_time,'%H:%i') AS start_time,
                    TIME_FORMAT(end_time,'%H:%i') AS end_time,reason,created_at FROM schedule_blocks WHERE id=?`,
                    [result.insertId],
                );
                await connection.commit();
                return send(response, 201, formatScheduleBlock(rows[0]));
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }
        if (request.method === 'DELETE') {
            if (!Number.isInteger(id) || id < 1) fail(422, 'Bloqueio inválido.');
            const [result] = await pool.execute('DELETE FROM schedule_blocks WHERE id=?', [id]);
            if (!result.affectedRows) fail(404, 'Bloqueio não encontrado.');
            return send(response, 200, { success: true });
        }
        return fail(405, 'Método não permitido.');
    }
    if (request.method === 'POST' && path === '/api/account/register') {
        const data = await body(request);
        const name = data.name?.trim();
        const phone = phoneKey(data.phone);
        const email = data.email?.trim().toLowerCase() || null;
        const password = String(data.password || '');
        const fields = {};
        if (!name || name.length < 2) fields.name = 'Informe seu nome completo.';
        if (phone.length < 10 || phone.length > 11) fields.phone = 'Informe um telefone válido com DDD.';
        if (!email) fields.email = 'Informe seu e-mail.';
        else if (!/^\S+@\S+\.\S+$/.test(email)) fields.email = 'Informe um e-mail válido.';
        if (password.length < 6) fields.password = 'A senha deve ter ao menos 6 caracteres.';
        if (Object.keys(fields).length) fail(422, 'Revise os campos destacados.', fields);
        const [matches] = await pool.execute(
            "SELECT id,password_hash,REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')','') AS phone_key,LOWER(email) AS email_key FROM clients WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')','')=? OR LOWER(email)=?",
            [phone, email],
        );
        const phoneMatch = matches.find((item) => item.phone_key === phone);
        const emailMatch = matches.find((item) => item.email_key === email);
        const ids = [...new Set(matches.map((item) => item.id))];
        const duplicateFields = {};
        if (phoneMatch?.password_hash) duplicateFields.phone = 'Este telefone já está cadastrado em outra conta.';
        if (emailMatch?.password_hash) duplicateFields.email = 'Este e-mail já está cadastrado em outra conta.';
        if (ids.length > 1) {
            if (phoneMatch) duplicateFields.phone = 'Este telefone já está cadastrado em outro perfil.';
            if (emailMatch) duplicateFields.email = 'Este e-mail já está cadastrado em outro perfil.';
        }
        if (Object.keys(duplicateFields).length) fail(409, 'Já existe um cadastro com os dados destacados.', duplicateFields);
        let clientId;
        if (matches[0]) {
            if (matches[0].password_hash) fail(409, 'Esta cliente já possui uma conta. Faça login.');
            clientId = matches[0].id;
            await pool.execute("UPDATE clients SET name=?,phone=?,email=?,password_hash=?,role='user',is_owner=0 WHERE id=?", [
                name,
                phone,
                email,
                await passwordHash(password),
                clientId,
            ]);
        } else {
            const [result] = await pool.execute("INSERT INTO clients (name,phone,email,password_hash,role,is_owner) VALUES (?,?,?,?, 'user', 0)", [
                name,
                phone,
                email,
                await passwordHash(password),
            ]);
            clientId = result.insertId;
        }
        const token = await createSession(clientId);
        return send(response, 201, { token, client: { id: String(clientId), name, phone, email, role: 'user', isOwner: false } }, { 'Set-Cookie': sessionCookie(token) });
    }
    if (request.method === 'POST' && path === '/api/account/login') {
        const data = await body(request);
        const identifier = String(data.identifier || '').trim();
        const password = String(data.password || '');
        const fields = {};
        if (!identifier) fields.identifier = 'Informe seu telefone ou e-mail.';
        if (!password) fields.password = 'Informe sua senha.';
        if (Object.keys(fields).length) fail(422, 'Revise os campos destacados.', fields);
        const [rows] = await pool.execute("SELECT id,name,phone,email,password_hash,COALESCE(role,'user') AS role,COALESCE(is_owner,0) AS isOwner FROM clients WHERE phone=? OR LOWER(email)=? LIMIT 1", [
            phoneKey(identifier),
            identifier.toLowerCase(),
        ]);
        if (!rows[0]) fail(401, 'Não encontramos uma conta com este telefone ou e-mail.', { identifier: 'Telefone ou e-mail não encontrado.' });
        if (!rows[0].password_hash)
            fail(401, 'Esta cliente ainda não possui senha. Use a aba Cadastro para criar o acesso.', { identifier: 'Esta conta ainda não possui senha.' });
        if (!(await passwordMatches(password, rows[0].password_hash))) fail(401, 'Senha incorreta.', { password: 'Senha incorreta.' });
        const token = await createSession(rows[0].id);
        return send(response, 200, { token, client: accountPayload(rows[0]) }, { 'Set-Cookie': sessionCookie(token) });
    }
    if (request.method === 'POST' && path === '/api/account/password-reset/request') {
        const data = await body(request);
        const email = String(data.email || '').trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) fail(422, 'Informe um e-mail válido.', { email: 'Informe um e-mail válido.' });
        const [rows] = await pool.execute('SELECT id,name,email FROM clients WHERE LOWER(email)=? AND password_hash IS NOT NULL LIMIT 1', [email]);
        if (rows[0]) {
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const client = rows[0];
            await pool.execute('DELETE FROM password_reset_tokens WHERE client_id=? OR expires_at<NOW()', [client.id]);
            await pool.execute('INSERT INTO password_reset_tokens (client_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 1 HOUR))', [
                client.id,
                tokenHash,
            ]);
            const resetUrl = `${publicAppUrl(request)}/index.html?reset=${encodeURIComponent(token)}`;
            try {
                await sendTransactionalEmail(
                    client.email,
                    'Redefinição de senha — Studio Marcelly Freitas',
                    `Olá, ${client.name}.\n\nRecebemos uma solicitação para redefinir sua senha. Use o link abaixo em até 1 hora:\n${resetUrl}\n\nSe você não fez esta solicitação, ignore este e-mail.`,
                );
            } catch (error) {
                await pool.execute('DELETE FROM password_reset_tokens WHERE token_hash=?', [tokenHash]);
                console.error('Falha ao enviar e-mail de redefinição de senha.', error);
                fail(503, 'Não foi possível enviar o e-mail de recuperação. Tente novamente mais tarde.');
            }
        }
        return send(response, 200, { message: 'Se houver uma conta com este e-mail, enviaremos as instruções de recuperação.' });
    }
    if (request.method === 'POST' && path === '/api/account/password-reset/confirm') {
        const data = await body(request);
        const token = String(data.token || '');
        const password = String(data.password || '');
        if (!/^[a-f0-9]{64}$/i.test(token)) fail(422, 'O link de recuperação é inválido ou expirou.');
        if (password.length < 6) fail(422, 'A senha deve ter ao menos 6 caracteres.', { password: 'A senha deve ter ao menos 6 caracteres.' });
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [rows] = await connection.execute(
                'SELECT id,client_id FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>NOW() FOR UPDATE',
                [tokenHash],
            );
            if (!rows[0]) fail(422, 'O link de recuperação é inválido ou expirou. Solicite um novo e-mail.');
            const clientId = rows[0].client_id;
            await connection.execute('UPDATE clients SET password_hash=? WHERE id=?', [await passwordHash(password), clientId]);
            await connection.execute('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=?', [rows[0].id]);
            await connection.execute('DELETE FROM client_sessions WHERE client_id=?', [clientId]);
            await connection.commit();
            return send(response, 200, { success: true });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    if (path === '/api/account/me') {
        const client = await authenticatedClient(request);
        if (request.method === 'GET') return send(response, 200, accountPayload(client));
        if (request.method === 'PUT') {
            const data = await body(request);
            const name = data.name?.trim();
            const phone = phoneKey(data.phone);
            const email = data.email?.trim().toLowerCase() || null;
            if (!name || !phone) fail(422, 'Nome e telefone são obrigatórios.');
            if (email && !/^\S+@\S+\.\S+$/.test(email)) fail(422, 'Informe um e-mail válido.');
            const [duplicates] = await pool.execute(
                "SELECT id FROM clients WHERE id<>? AND (REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')','')=? OR (? IS NOT NULL AND LOWER(email)=?)) LIMIT 1",
                [client.id, phone, email, email],
            );
            if (duplicates[0]) fail(409, 'Telefone ou e-mail já pertencem a outra cliente.');
            await pool.execute('UPDATE clients SET name=?,phone=?,email=? WHERE id=?', [name, phone, email, client.id]);
            return send(response, 200, { ...accountPayload(client), name, phone, email });
        }
    }
    if (path === '/api/account/logout' && request.method === 'POST') {
        const token = sessionToken(request);
        if (token)
            await pool.execute('DELETE FROM client_sessions WHERE token_hash=?', [crypto.createHash('sha256').update(token).digest('hex')]);
        return send(response, 200, { success: true }, { 'Set-Cookie': sessionCookie('', 0) });
    }
    if (path === '/api/account/availability' && request.method === 'GET') {
        const client = await authenticatedClient(request);
        const appointmentId = Number(query.get('appointment_id'));
        const bookingDate = date(query.get('date'));
        if (bookingDate < new Date().toISOString().slice(0, 10)) fail(422, 'Escolha uma data futura.');
        const [appointments] = await pool.execute('SELECT id,service_id FROM appointments WHERE id=? AND client_id=?', [
            appointmentId,
            client.id,
        ]);
        if (!appointments[0]) fail(404, 'Agendamento não encontrado.');
        const selected = await service(pool, appointments[0].service_id);
        const slots = await availableSlots(pool, bookingDate, selected.minutes, appointmentId);
        return send(response, 200, { slots, duration_minutes: selected.minutes });
    }
    if (path === '/api/account/bookings' && request.method === 'POST') {
        const client = await authenticatedClient(request);
        const data = await body(request);
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const selected = await service(connection, data.service_id, true);
            const bookingDate = date(data.date);
            if (bookingDate < new Date().toISOString().slice(0, 10)) fail(422, 'Escolha uma data futura.');
            const start = minutes(data.start_time);
            const end = await validateSlot(connection, bookingDate, start, selected.minutes, 0, false, true);
            const [result] = await connection.execute(
                "INSERT INTO appointments (client_id,client_name,client_phone,service_id,service_name,booking_date,start_time,end_time,duration_minutes,service_price,deposit_amount,paid_amount,payment_recorded_manually,notes,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')",
                [
                    client.id,
                    client.name,
                    client.phone,
                    selected.id,
                    selected.name,
                    bookingDate,
                    time(start),
                    time(end),
                    selected.minutes,
                    selected.price,
                    selected.deposit,
                    0,
                    0,
                    data.notes?.trim() || null,
                ],
            );
            await connection.commit();
            const created = await appointment(pool, result.insertId);
            void notifyAdministrator(created);
            return send(response, 201, created);
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    if (path === '/api/account/appointments' && request.method === 'GET') {
        const client = await authenticatedClient(request);
        const scope = query.get('scope') || 'upcoming';
        const today = new Date().toISOString().slice(0, 10);
        let condition = "booking_date>=? AND status NOT IN ('cancelled','completed','no_show')",
            params = [client.id, today];
        if (scope === 'history') {
            condition = "(booking_date<? OR status IN ('completed','cancelled','no_show'))";
            params = [client.id, today];
        }
        if (scope === 'manage') condition = "booking_date>=? AND status NOT IN ('cancelled','completed','no_show')";
        const [rows] = await pool.execute(
            `SELECT id,service_name,DATE_FORMAT(booking_date,'%Y-%m-%d') AS date,TIME_FORMAT(start_time,'%H:%i') AS start_time,TIME_FORMAT(end_time,'%H:%i') AS end_time,duration_minutes,service_price AS price,deposit_amount AS deposit,status FROM appointments WHERE client_id=? AND ${condition} ORDER BY booking_date,start_time`,
            params,
        );
        return send(response, 200, rows.map(format));
    }
    if (/^\/api\/account\/appointments\/\d+$/.test(path) && request.method === 'PATCH') {
        const client = await authenticatedClient(request);
        const id = Number(path.split('/').pop());
        const data = await body(request);
        const [rows] = await pool.execute('SELECT id,service_id,status FROM appointments WHERE id=? AND client_id=?', [id, client.id]);
        if (!rows[0]) fail(404, 'Agendamento não encontrado.');
        if (['cancelled', 'completed', 'no_show'].includes(rows[0].status)) fail(422, 'Este agendamento não pode ser alterado.');
        if (data.action === 'cancel') {
            await pool.execute("UPDATE appointments SET status='cancelled' WHERE id=?", [id]);
            return send(response, 200, { success: true });
        }
        if (data.action === 'reschedule') {
            const connection = await pool.getConnection();
            try {
                await connection.beginTransaction();
                const selected = await service(connection, rows[0].service_id, true);
                const bookingDate = date(data.date);
                if (bookingDate < new Date().toISOString().slice(0, 10)) fail(422, 'Escolha uma data futura.');
                const start = minutes(data.start_time);
                const end = await validateSlot(connection, bookingDate, start, selected.minutes, id, false, true);
                await connection.execute('UPDATE appointments SET booking_date=?,start_time=?,end_time=? WHERE id=?', [
                    bookingDate,
                    time(start),
                    time(end),
                    id,
                ]);
                await connection.commit();
                return send(response, 200, { success: true });
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        }
        fail(422, 'Ação inválida.');
    }
    if (path === '/api/admin/dashboard' && request.method === 'GET') {
        return send(response, 200, await dashboardData(pool));
    }
    if (path === '/api/admin/administrators') {
        await requireOwner(request);
        const id = Number(query.get('id'));
        if (request.method === 'GET') {
            if (query.get('scope') === 'candidates') {
                const search = String(query.get('q') || '').trim();
                const term = `%${search}%`;
                const [rows] = await pool.execute(
                    `SELECT id,name,phone,email FROM clients
                    WHERE role='user' AND password_hash IS NOT NULL
                        AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)
                    ORDER BY name ASC LIMIT 50`,
                    [term, term, term],
                );
                return send(response, 200, rows.map((row) => ({ ...row, id: String(row.id) })));
            }
            const [rows] = await pool.execute(
                `SELECT id,name,phone,email,role,is_owner AS isOwner,created_at
                FROM clients WHERE role='master' ORDER BY is_owner DESC,name ASC`,
            );
            return send(response, 200, rows.map((row) => ({ ...row, id: String(row.id), isOwner: Boolean(row.isOwner) })));
        }
        if (request.method === 'POST') {
            const data = await body(request);
            const clientId = Number(data.client_id);
            if (!Number.isInteger(clientId) || clientId < 1) fail(422, 'Selecione uma cliente válida.');
            const [rows] = await pool.execute('SELECT id,name,role,is_owner AS isOwner,password_hash FROM clients WHERE id=?', [clientId]);
            if (!rows[0]) fail(404, 'Cliente não encontrada.');
            if (rows[0].role === 'master') fail(409, 'Esta cliente já possui acesso administrativo.');
            if (!rows[0].password_hash) fail(422, 'Esta cliente ainda não possui uma conta com senha para acessar o painel.');
            await pool.execute("UPDATE clients SET role='master',is_owner=0 WHERE id=?", [clientId]);
            return send(response, 200, { success: true, id: String(clientId) });
        }
        if (request.method === 'PATCH') {
            if (!Number.isInteger(id) || id < 1) fail(422, 'Administradora inválida.');
            const data = await body(request);
            if (data.action !== 'remove_master') fail(422, 'Ação administrativa inválida.');
            const [rows] = await pool.execute('SELECT id,role,is_owner AS isOwner FROM clients WHERE id=?', [id]);
            if (!rows[0]) fail(404, 'Administradora não encontrada.');
            if (rows[0].isOwner) fail(422, 'A proprietária não pode ter o próprio acesso administrativo removido.');
            if (rows[0].role !== 'master') fail(422, 'Esta cliente não possui acesso administrativo.');
            await pool.execute("UPDATE clients SET role='user',is_owner=0 WHERE id=?", [id]);
            return send(response, 200, { success: true });
        }
        return fail(405, 'Método não permitido.');
    }
    if (path === '/api/reports') {
        if (request.method === 'GET') return send(response, 200, await reportData(pool, query));
        return fail(405, 'Método não permitido.');
    }
    if (path === '/api/admin/services') {
        const id = Number(query.get('id'));
        if (request.method === 'GET') {
            const [rows] = await pool.query('SELECT id,name,price AS value,duration,deposit,maintenance_days,active FROM services ORDER BY id DESC');
            return send(response, 200, rows.map(formatService));
        }
        if (request.method === 'POST' || request.method === 'PUT') {
            if (request.method === 'PUT' && (!Number.isInteger(id) || id < 1)) fail(422, 'Serviço inválido.');
            const data = servicePayload(await body(request));
            if (request.method === 'POST') {
                const [result] = await pool.execute(
                    'INSERT INTO services (name,price,duration,deposit,maintenance_days) VALUES (?,?,?,?,?)',
                    [data.name, data.value, data.duration, data.deposit, data.maintenanceDays],
                );
                const [rows] = await pool.execute('SELECT id,name,price AS value,duration,deposit,maintenance_days,active FROM services WHERE id=?', [result.insertId]);
                return send(response, 201, formatService(rows[0]));
            }
            const [result] = await pool.execute(
                'UPDATE services SET name=?,price=?,duration=?,deposit=?,maintenance_days=? WHERE id=?',
                [data.name, data.value, data.duration, data.deposit, data.maintenanceDays, id],
            );
            if (!result.affectedRows) fail(404, 'Serviço não encontrado.');
            const [rows] = await pool.execute('SELECT id,name,price AS value,duration,deposit,maintenance_days,active FROM services WHERE id=?', [id]);
            return send(response, 200, formatService(rows[0]));
        }
        if (request.method === 'PATCH') {
            if (!Number.isInteger(id) || id < 1) fail(422, 'Serviço inválido.');
            const data = await body(request);
            if (typeof data.active !== 'boolean') fail(422, 'Status do serviço inválido.');
            const [result] = await pool.execute('UPDATE services SET active=? WHERE id=?', [data.active ? 1 : 0, id]);
            if (!result.affectedRows) fail(404, 'Serviço não encontrado.');
            const [rows] = await pool.execute('SELECT id,name,price AS value,duration,deposit,maintenance_days,active FROM services WHERE id=?', [id]);
            return send(response, 200, formatService(rows[0]));
        }
        if (request.method === 'DELETE') {
            if (!Number.isInteger(id) || id < 1) fail(422, 'Serviço inválido.');
            const [usage] = await pool.execute('SELECT COUNT(*) AS total FROM appointments WHERE service_id=?', [id]);
            if (Number(usage[0].total) > 0) fail(409, 'Este serviço possui agendamentos e não pode ser excluído. Desative-o para removê-lo dos novos agendamentos.');
            const [result] = await pool.execute('DELETE FROM services WHERE id=?', [id]);
            if (!result.affectedRows) fail(404, 'Serviço não encontrado.');
            return send(response, 200, { success: true });
        }
        return fail(405, 'Método não permitido.');
    }
    if (path === '/api/billing') {
        if (request.method === 'GET') {
            const range = billingRange(query);
            const records = await billingRecords(pool, range);
            return send(response, 200, { ...range, summary: billingSummary(records), records });
        }
        if (request.method === 'PATCH') {
            const id = Number(query.get('id'));
            if (!Number.isInteger(id) || id < 1) fail(422, 'Registro financeiro inválido.');
            const data = await body(request);
            const [rows] = await pool.execute('SELECT id,service_price,status FROM appointments WHERE id=?', [id]);
            const current = rows[0];
            if (!current) fail(404, 'Agendamento não encontrado.');
            if (['cancelled', 'no_show'].includes(current.status)) fail(422, 'Este agendamento não possui faturamento ativo.');

            const price = money(current.service_price);
            const paid = data.action === 'mark_paid' ? price : Number(data.paid_amount);
            if (!Number.isFinite(paid) || paid < 0 || paid > price || Math.round(paid * 100) !== paid * 100)
                fail(422, 'Informe um valor pago entre zero e o valor total do serviço.');

            await pool.execute('UPDATE appointments SET paid_amount=?,payment_recorded_manually=1 WHERE id=?', [paid, id]);
            return send(response, 200, { success: true, id: String(id), paid_amount: paid });
        }
        return fail(405, 'Método não permitido.');
    }
    if (path === '/api/maintenances') {
        const id = Number(query.get('id'));
        if (request.method === 'GET' && query.has('id')) return send(response, 200, await maintenanceRecord(pool, id));
        if (request.method === 'GET') {
            const [rows] = await pool.query(`${maintenanceSelect} ORDER BY m.maintenance_date ASC, m.created_at DESC`);
            return send(response, 200, rows.map(formatMaintenance));
        }
        if (request.method === 'PATCH') {
            if (!Number.isInteger(id) || id < 1) fail(422, 'Manutenção inválida.');
            const data = await body(request);
            const current = await maintenanceRecord(pool, id);
            if (data.action === 'reminder_sent') {
                if (current.stored_status === 'cancelled') fail(422, 'Esta manutenção está cancelada.');
                await pool.execute("UPDATE maintenance_records SET status='reminder_sent',reminder_sent_at=NOW() WHERE id=?", [id]);
                return send(response, 200, await maintenanceRecord(pool, id));
            }
            if (data.action === 'cancel') {
                await pool.execute("UPDATE maintenance_records SET status='cancelled',cancelled_at=NOW() WHERE id=?", [id]);
                return send(response, 200, await maintenanceRecord(pool, id));
            }
            if (Object.hasOwn(data, 'maintenance_date')) {
                const maintenanceDate = date(data.maintenance_date);
                await pool.execute('UPDATE maintenance_records SET maintenance_date=? WHERE id=?', [maintenanceDate, id]);
                return send(response, 200, await maintenanceRecord(pool, id));
            }
            fail(422, 'Informe uma alteração válida para a manutenção.');
        }
        return fail(405, 'Método não permitido.');
    }
    if (request.method === 'GET' && path === '/api/services') {
        const [rows] = await pool.query('SELECT id,name,price AS value,duration,deposit,maintenance_days,active FROM services WHERE active=1 ORDER BY name');
        return send(
            response,
            200,
            rows.map(formatService),
        );
    }
    if (path === '/api/clients' || /^\/api\/clients\/\d+$/.test(path)) {
        const clientId = path === '/api/clients' ? null : Number(path.split('/').pop());
        if (request.method === 'GET' && clientId) {
            const [clients] = await pool.execute('SELECT id,name,phone,email,created_at FROM clients WHERE id=?', [clientId]);
            if (!clients[0]) fail(404, 'Cliente não encontrada.');
            const [appointments] = await pool.execute(
                "SELECT id,service_name,DATE_FORMAT(booking_date,'%Y-%m-%d') AS date,TIME_FORMAT(start_time,'%H:%i') AS start_time,TIME_FORMAT(end_time,'%H:%i') AS end_time,status,service_price AS price,deposit_amount AS deposit FROM appointments WHERE client_id=? ORDER BY booking_date DESC,start_time DESC",
                [clientId],
            );
            const client = {
                ...clients[0],
                id: String(clients[0].id),
                appointments: appointments.map((item) => ({
                    ...item,
                    id: String(item.id),
                    price: Number(item.price),
                    deposit: item.deposit == null ? null : Number(item.deposit),
                })),
            };
            client.next_appointment =
                client.appointments.find(
                    (item) =>
                        item.date >= new Date().toISOString().slice(0, 10) && !['cancelled', 'completed', 'no_show'].includes(item.status),
                ) || null;
            client.cancellations = client.appointments.filter((item) => item.status === 'cancelled').length;
            client.no_shows = client.appointments.filter((item) => item.status === 'no_show').length;
            return send(response, 200, client);
        }
        if (request.method === 'GET') {
            const q = `%${query.get('q') || ''}%`;
            const [rows] = await pool.execute(
                `SELECT c.id,c.name,c.phone,c.email,
                (SELECT CONCAT(DATE_FORMAT(a.booking_date,'%Y-%m-%d'),'|',TIME_FORMAT(a.start_time,'%H:%i'),'|',a.service_name) FROM appointments a WHERE a.client_id=c.id AND a.booking_date>=CURDATE() AND a.status NOT IN ('cancelled','completed','no_show') ORDER BY a.booking_date,a.start_time LIMIT 1) AS next_appointment,
                (SELECT COUNT(*) FROM appointments a WHERE a.client_id=c.id AND a.status='cancelled') AS cancellations,
                (SELECT COUNT(*) FROM appointments a WHERE a.client_id=c.id AND a.status='no_show') AS no_shows
                FROM clients c WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? ORDER BY c.name LIMIT 100`,
                [q, q, q],
            );
            return send(
                response,
                200,
                rows.map((row) => ({
                    ...row,
                    id: String(row.id),
                    cancellations: Number(row.cancellations),
                    no_shows: Number(row.no_shows),
                })),
            );
        }
        if (request.method === 'POST') {
            const data = await body(request);
            const name = data.name?.trim();
            const phone = phoneKey(data.phone);
            const email = data.email?.trim().toLowerCase() || null;
            if (!name || !phone) fail(422, 'Informe nome e telefone válidos.');
            if (email && !/^\S+@\S+\.\S+$/.test(email)) fail(422, 'Informe um e-mail válido.');
            const [duplicates] = await pool.execute(
                "SELECT id FROM clients WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone,' ',''),'-',''),'(',''),')','')=? OR (? IS NOT NULL AND LOWER(email)=?) LIMIT 1",
                [phone, email, email],
            );
            if (duplicates[0]) fail(409, 'Já existe uma cliente cadastrada com este telefone ou e-mail.');
            const [result] = await pool.execute("INSERT INTO clients (name,phone,email,role,is_owner) VALUES (?,?,?, 'user', 0)", [name, phone, email]);
            return send(response, 201, { id: String(result.insertId), name, phone, email });
        }
    }
    if (path !== '/api/appointments') return fail(404, 'Rota não encontrada.');
    if (request.method === 'GET' && query.has('availability')) {
        const bookingDate = date(query.get('date'));
        const selectedService = await service(pool, query.get('service_id'));
        const slots = await availableSlots(pool, bookingDate, selectedService.minutes, query.get('exclude_id') || 0);
        return send(response, 200, { slots, duration_minutes: selectedService.minutes });
    }
    if (request.method === 'GET' && query.has('id')) return send(response, 200, await appointment(pool, query.get('id')));
    if (request.method === 'GET') {
        const where = [];
        const params = [];
        const today = new Date().toISOString().slice(0, 10);
        if (query.get('date')) {
            where.push('a.booking_date=?');
            params.push(query.get('date'));
        }
        if (query.get('service_id')) {
            where.push('a.service_id=?');
            params.push(query.get('service_id'));
        }
        if (query.get('status')) {
            where.push('a.status=?');
            params.push(query.get('status'));
        }
        if (query.get('q')) {
            where.push('(a.client_name LIKE ? OR a.client_phone LIKE ? OR c.email LIKE ?)');
            const q = `%${query.get('q')}%`;
            params.push(q, q, q);
        }
        const quick = query.get('quick');
        if (quick === 'today') {
            where.push('a.booking_date=?');
            params.push(today);
        }
        if (quick === 'tomorrow') {
            where.push('a.booking_date=DATE_ADD(?,INTERVAL 1 DAY)');
            params.push(today);
        }
        if (quick === 'week') {
            where.push('a.booking_date BETWEEN ? AND DATE_ADD(?,INTERVAL 6 DAY)');
            params.push(today, today);
        }
        if (quick === 'upcoming') {
            where.push("a.booking_date>=? AND a.status NOT IN ('cancelled','completed','no_show')");
            params.push(today);
        }
        if (quick === 'completed' || quick === 'cancelled') {
            where.push('a.status=?');
            params.push(quick);
        }
        const [rows] = await pool.execute(
            `SELECT a.id,a.client_id,a.client_name,a.client_phone AS phone,c.email,a.service_id,a.service_name,DATE_FORMAT(a.booking_date,'%Y-%m-%d') AS date,TIME_FORMAT(a.start_time,'%H:%i') AS start_time,TIME_FORMAT(a.end_time,'%H:%i') AS end_time,a.duration_minutes,a.service_price AS price,a.deposit_amount AS deposit,a.notes,a.status,a.cancellation_reason,a.completed_at,a.created_at FROM appointments a LEFT JOIN clients c ON c.id=a.client_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY a.booking_date,a.start_time`,
            params,
        );
        return send(response, 200, rows.map(format));
    }
    if (request.method === 'POST') {
        const data = await body(request);
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            let client;
            if (data.client_id) {
                const [rows] = await connection.execute('SELECT id,name,phone FROM clients WHERE id=?', [Number(data.client_id)]);
                client = rows[0];
                if (!client) fail(422, 'Cliente não encontrada.');
            } else {
                if (!data.client_name?.trim() || !data.phone?.trim()) fail(422, 'Selecione uma cliente ou informe nome e telefone.');
                const [result] = await connection.execute("INSERT INTO clients (name,phone,email,role,is_owner) VALUES (?,?,?, 'user', 0)", [
                    data.client_name.trim(),
                    data.phone.trim(),
                    data.email?.trim() || null,
                ]);
                client = { id: result.insertId, name: data.client_name.trim(), phone: data.phone.trim() };
            }
            const selectedService = await service(connection, data.service_id, true);
            const bookingDate = date(data.date);
            const start = minutes(data.start_time);
            const end = await validateSlot(connection, bookingDate, start, selectedService.minutes, 0, Boolean(data.allow_override), true);
            const [result] = await connection.execute(
                "INSERT INTO appointments (client_id,client_name,client_phone,service_id,service_name,booking_date,start_time,end_time,duration_minutes,service_price,deposit_amount,paid_amount,payment_recorded_manually,notes,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')",
                [
                    client.id,
                    client.name,
                    client.phone,
                    selectedService.id,
                    selectedService.name,
                    bookingDate,
                    time(start),
                    time(end),
                    selectedService.minutes,
                    selectedService.price,
                    selectedService.deposit,
                    0,
                    0,
                    data.notes?.trim() || null,
                ],
            );
            await connection.commit();
            return send(response, 201, await appointment(pool, result.insertId));
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    if (request.method === 'PUT') {
        const id = Number(query.get('id'));
        const data = await body(request);
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const current = await appointment(connection, id);
            if (['cancelled', 'completed', 'no_show'].includes(current.status)) fail(422, 'Este agendamento não pode ser remarcado.');
            const selectedService = await service(connection, current.service_id, true);
            const bookingDate = date(data.date);
            const start = minutes(data.start_time);
            const end = await validateSlot(connection, bookingDate, start, selectedService.minutes, id, Boolean(data.allow_override), true);
            await connection.execute(
                'UPDATE appointments SET booking_date=?,start_time=?,end_time=?,duration_minutes=?,service_price=?,deposit_amount=? WHERE id=?',
                [bookingDate, time(start), time(end), selectedService.minutes, selectedService.price, selectedService.deposit, id],
            );
            await connection.commit();
            return send(response, 200, await appointment(pool, id));
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    if (request.method === 'PATCH') {
        const id = Number(query.get('id'));
        const data = await body(request);
        if (!statuses.has(data.status)) fail(422, 'Status inválido.');
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const current = await appointment(connection, id);
            const allowed = {
                pending: ['completed', 'cancelled', 'no_show'],
                confirmed: ['completed', 'cancelled', 'no_show'],
                in_progress: ['completed', 'cancelled'],
                completed: [],
                cancelled: [],
                no_show: [],
            };
            if (!allowed[current.status]?.includes(data.status)) fail(422, 'Esta alteração de status não é permitida.');
            await connection.execute('UPDATE appointments SET status=?,cancellation_reason=?,completed_at=? WHERE id=?', [
                data.status,
                data.status === 'cancelled' ? data.cancellation_reason?.trim() || null : null,
                data.status === 'completed' ? new Date() : null,
                id,
            ]);
            if (data.status === 'completed') await createMaintenanceRecord(connection, current);
            await connection.commit();
            return send(response, 200, await appointment(pool, id));
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
    fail(405, 'Método não permitido.');
}

http.createServer((request, response) =>
    handler(request, response).catch((error) => {
        console.error(error);
        send(response, error.status || 500, { error: error.message || 'Erro interno do servidor.', ...(error.fields ? { fields: error.fields } : {}) });
    }),
).listen(port, serverHost, () => console.log(`API administrativa em http://${serverHost}:${port}`));
