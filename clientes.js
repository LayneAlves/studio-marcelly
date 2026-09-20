const CLIENTS_API = `http://${window.location.hostname || '127.0.0.1'}:3000/api/clients`;
const clientsList = document.getElementById('clientsList');
const clientsSearch = document.getElementById('clientsSearch');
const clientsEmpty = document.getElementById('clientsEmptyState');
const clientDialog = document.getElementById('clientDialog');
const clientDialogContent = document.getElementById('clientDialogContent');

let searchTimer;

const labels = {
    pending: 'Pendente',
    confirmed: 'Confirmado',
    in_progress: 'Em atendimento',
    completed: 'Concluído',
    cancelled: 'Cancelado',
    no_show: 'Não compareceu',
};

const esc = (value = '') => {
    const element = document.createElement('div');
    element.textContent = value ?? '';
    return element.innerHTML;
};

const dateLabel = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

async function api(path = '', options = {}) {
    const response = await fetch(`${CLIENTS_API}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
    return data;
}

function clientInitial(name) {
    return String(name || '?').trim().charAt(0).toUpperCase() || '?';
}

function clientCardLashes() {
    return '<svg class="appointment-card-lashes" viewBox="0 0 170 50" aria-hidden="true"><path d="M18 38C45 15 72 15 98 38M45 38C61 20 77 20 92 38M100 38c16-14 31-14 47 0M57 30l-7-14M68 26l-3-16M80 25V9M92 26l4-16M104 29l8-14"/></svg>';
}

function nextAppointmentLabel(next) {
    if (!next) return 'Sem agendamento futuro';
    return `${dateLabel(next[0])} · ${next[1]}`;
}

function renderClients(clients) {
    clientsList.replaceChildren();
    clientsEmpty.hidden = clients.length > 0;

    clients.forEach((client) => {
        const next = client.next_appointment ? client.next_appointment.split('|') : null;
        const card = document.createElement('article');
        card.className = 'appointment-card client-card';
        card.innerHTML = `<header class="appointment-card-header"><div class="appointment-card-client"><span class="appointment-card-avatar" aria-hidden="true">${esc(clientInitial(client.name))}</span><div><h3>${esc(client.name)}</h3><p>${next ? esc(next[2]) : 'Cliente cadastrada'}</p></div></div><span class="client-card-summary"><i class="fa-regular fa-user" aria-hidden="true"></i> Cliente</span></header><div class="appointment-card-divider" aria-hidden="true"></div><div class="appointment-card-body"><div class="appointment-card-data client-card-data"><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-solid fa-phone" aria-hidden="true"></i></span><div><p>Telefone</p><strong>${esc(client.phone)}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-regular fa-envelope" aria-hidden="true"></i></span><div><p>E-mail</p><strong>${esc(client.email || 'Não informado')}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span><div><p>Próximo agendamento</p><strong>${nextAppointmentLabel(next)}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-regular fa-clipboard" aria-hidden="true"></i></span><div><p>Histórico</p><strong><span class="client-card-counts">${client.cancellations} cancelamento${Number(client.cancellations) === 1 ? '' : 's'} · ${client.no_shows} falta${Number(client.no_shows) === 1 ? '' : 's'}</span></strong></div></div></div>${clientCardLashes()}</div><div class="appointment-card-divider" aria-hidden="true"></div><footer class="appointment-card-footer"><button class="appointment-card-details client-profile-action" type="button" data-client-id="${client.id}">Ver perfil <span aria-hidden="true">›</span></button></footer>`;
        clientsList.append(card);
    });
}

async function loadClients() {
    try {
        const clients = await api(`?q=${encodeURIComponent(clientsSearch.value.trim())}`);
        renderClients(clients);
    } catch (error) {
        clientsList.replaceChildren();
        clientsEmpty.hidden = false;
        clientsEmpty.textContent = error.message;
    }
}

function openDialog(content, variant = '') {
    clientDialog.classList.toggle('is-appointment-details-dialog', variant === 'detail');
    clientDialogContent.innerHTML = content;
    clientDialog.showModal();
}

function closeDialog() {
    if (clientDialog.open) clientDialog.close();
    clientDialog.classList.remove('is-appointment-details-dialog');
}

function profileLashes() {
    return '<svg class="booking-detail-lashes" viewBox="0 0 170 50" aria-hidden="true"><path d="M18 38C45 15 72 15 98 38M45 38C61 20 77 20 92 38M100 38c16-14 31-14 47 0M57 30l-7-14M68 26l-3-16M80 25V9M92 26l4-16M104 29l8-14"/></svg>';
}

async function profile(id) {
    try {
        const client = await api(`/${id}`);
        const next = client.next_appointment;
        const history = client.appointments.map((item) => `<article class="client-history-item"><div><strong>${esc(item.service_name)}</strong><p>${dateLabel(item.date)} · ${item.start_time} — ${item.end_time}</p></div><span class="status-badge status-${item.status}">${labels[item.status] || 'Pendente'}</span></article>`).join('') || '<p class="service-empty-state">Nenhum agendamento no histórico.</p>';
        const nextAppointment = next ? `${esc(next.service_name)} · ${dateLabel(next.date)} às ${next.start_time}` : 'Não há agendamento futuro';

        openDialog(`<article class="booking-detail-modal client-detail-modal"><header class="booking-detail-header"><div><p class="booking-detail-eyebrow">Studio Marcelly Freitas</p><h2>Perfil da cliente</h2><p class="booking-detail-service">Histórico e informações</p></div>${profileLashes()}</header><section class="booking-detail-card booking-detail-client-card"><div class="booking-detail-client"><span class="booking-detail-avatar" aria-hidden="true">${esc(clientInitial(client.name))}</span><div><p class="booking-detail-label">Cliente</p><strong>${esc(client.name)}</strong></div></div><div class="booking-detail-card-divider" aria-hidden="true"></div><div class="booking-detail-contact"><p><i class="fa-solid fa-phone" aria-hidden="true"></i><span>${esc(client.phone)}</span></p><p><i class="fa-regular fa-envelope" aria-hidden="true"></i><span>${esc(client.email || 'E-mail não informado')}</span></p></div></section><section class="booking-detail-card booking-detail-info-card"><p class="booking-detail-section-title">Resumo de atendimentos</p><div class="booking-detail-info-list"><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span><div><p class="booking-detail-label">Próximo atendimento</p><strong>${nextAppointment}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-solid fa-xmark" aria-hidden="true"></i></span><div><p class="booking-detail-label">Cancelamentos</p><strong>${client.cancellations}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i></span><div><p class="booking-detail-label">Não compareceu</p><strong>${client.no_shows}</strong></div></div></div></section><section class="booking-detail-card client-history-card"><p class="booking-detail-section-title">Histórico de agendamentos</p><div class="client-history-list">${history}</div></section></article>`, 'detail');
    } catch (error) {
        alert(error.message);
    }
}

function newClientForm() {
    openDialog(`<h2>Nova cliente</h2><form class="client-form" id="clientForm"><div><label>Nome</label><input id="clientName" required></div><div><label>Telefone</label><input id="clientPhone" type="tel" data-phone-mask required></div><div><label>E-mail</label><input id="clientEmail" type="email"></div><button class="admin-button" type="submit">Cadastrar cliente</button><p class="client-feedback" id="clientFeedback"></p></form>`);

    document.getElementById('clientForm').addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            await api('', {
                method: 'POST',
                body: JSON.stringify({
                    name: document.getElementById('clientName').value,
                    phone: document.getElementById('clientPhone').value,
                    email: document.getElementById('clientEmail').value,
                }),
            });
            closeDialog();
            loadClients();
        } catch (error) {
            document.getElementById('clientFeedback').textContent = error.message;
        }
    });
}

clientsSearch.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadClients, 250);
});

clientsList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-client-id]');
    if (button) profile(button.dataset.clientId);
});

document.getElementById('newClientButton').addEventListener('click', newClientForm);
document.getElementById('clientDialogClose').addEventListener('click', closeDialog);

const sidebar = document.getElementById('clientsSidebar');
const toggle = document.getElementById('clientsMenuToggle');
const backdrop = document.getElementById('clientsBackdrop');

function menu(open) {
    sidebar.classList.toggle('is-open', open);
    toggle.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-visible', open);
}

toggle.addEventListener('click', () => menu(!sidebar.classList.contains('is-open')));
backdrop.addEventListener('click', () => menu(false));

loadClients();
