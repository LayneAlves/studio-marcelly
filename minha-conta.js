const API = `http://${location.hostname || '127.0.0.1'}:3000/api/account`;
let account = JSON.parse(localStorage.getItem('smf-account') || 'null');

const auth = document.getElementById('accountAuth');
const panel = document.getElementById('accountPanel');
const content = document.getElementById('accountContent');
const dialog = document.getElementById('accountDialog');
const dialogContent = document.getElementById('accountDialogContent');
const labels = { pending: 'Pendente', confirmed: 'Confirmado', in_progress: 'Em atendimento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Não compareceu' };
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function escapeHtml(value = '') {
    const item = document.createElement('span');
    item.textContent = value ?? '';
    return item.innerHTML;
}

function dateLabel(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function today() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
}

async function request(path = '', options = {}) {
    const response = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(account?.token ? { Authorization: `Bearer ${account.token}` } : {}) },
        ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível concluir esta ação.');
    return data;
}

function saveAccount(data) {
    account = data;
    localStorage.setItem('smf-account', JSON.stringify(data));
}

async function enter(data) {
    saveAccount(data);
    auth.hidden = true;
    panel.hidden = false;
    document.getElementById('accountGreeting').textContent = `Olá, ${data.client.name}`;
    await showSection('personal');
}

function emptyState(message) {
    content.innerHTML = `<div class="account-empty"><strong aria-hidden="true">📅</strong><p>${message}</p></div>`;
}

async function showSection(section) {
    if (section === 'logout') {
        await request('/logout', { method: 'POST' }).catch(() => {});
        localStorage.removeItem('smf-account');
        account = null;
        panel.hidden = true;
        auth.hidden = false;
        return;
    }

    document.querySelectorAll('[data-section]').forEach((button) => button.classList.toggle('is-active', button.dataset.section === section));
    try {
        if (section === 'personal') return renderPersonal();
        const scope = section === 'upcoming' ? 'upcoming' : section === 'history' ? 'history' : 'manage';
        const appointments = await request(`/appointments?scope=${scope}`);
        if (!appointments.length) {
            emptyState(section === 'history' ? 'Você ainda não tem nenhum agendamento marcado' : 'Nenhum agendamento encontrado.');
            return;
        }

        const title = section === 'upcoming' ? 'Próximos agendamentos' : section === 'history' ? 'Histórico' : 'Remarcar ou cancelar';
        content.innerHTML = `<h2>${title}</h2><div class="account-list">${appointments.map((appointment) => `
            <article class="account-card">
                <strong>${escapeHtml(appointment.service_name)}</strong>
                <p>${dateLabel(appointment.date)} · ${appointment.start_time} – ${appointment.end_time} · ${appointment.duration_minutes} min</p>
                <p>${money.format(appointment.price)} · ${labels[appointment.status] || appointment.status}</p>
                ${section === 'manage' ? `<div class="account-actions"><button class="account-action" data-reschedule="${appointment.id}">Remarcar</button><button class="account-action" data-cancel="${appointment.id}">Cancelar</button></div>` : ''}
            </article>`).join('')}</div>`;

        content.querySelectorAll('[data-cancel]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (!confirm('Deseja cancelar este agendamento?')) return;
                try {
                    await request(`/appointments/${button.dataset.cancel}`, { method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) });
                    showSection('manage');
                } catch (error) { alert(error.message); }
            });
        });
        content.querySelectorAll('[data-reschedule]').forEach((button) => {
            const appointment = appointments.find((item) => item.id === button.dataset.reschedule);
            button.addEventListener('click', () => openReschedule(button.dataset.reschedule, appointment));
        });
    } catch (error) {
        content.innerHTML = `<p class="account-feedback">${escapeHtml(error.message)}</p>`;
    }
}

async function renderPersonal() {
    const client = await request('/me');
    content.innerHTML = `<h2>Informações pessoais</h2><p>Atualize seus dados quando necessário.</p>
        <form class="account-form" id="personalForm">
            <label>Nome<input id="meName" value="${escapeHtml(client.name)}" required></label>
            <label>Telefone<input id="mePhone" type="tel" data-phone-mask value="${escapeHtml(client.phone)}" required></label>
            <label>E-mail<input id="meEmail" type="email" value="${escapeHtml(client.email || '')}"></label>
            <button class="account-button" type="submit">Salvar alterações</button><p class="account-feedback" id="personalFeedback"></p>
        </form>`;
    document.getElementById('personalForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = document.getElementById('personalFeedback');
        try {
            const updated = await request('/me', { method: 'PUT', body: JSON.stringify({ name: document.getElementById('meName').value, phone: document.getElementById('mePhone').value, email: document.getElementById('meEmail').value }) });
            saveAccount({ ...account, client: updated });
            document.getElementById('accountGreeting').textContent = `Olá, ${updated.name}`;
            result.textContent = 'Dados salvos com sucesso.';
        } catch (error) { result.textContent = error.message; }
    });
}

function openReschedule(id, appointment) {
    dialogContent.innerHTML = `<h2>Remarcar</h2><form class="account-form" id="rescheduleForm">
        <label>Nova data<input id="newDate" type="date" min="${today()}" required></label>
        <label>Novo horário<select id="newTime" required disabled><option value="">Escolha uma data primeiro</option></select></label>
        <button class="account-button" type="submit">Salvar alteração</button><p class="account-feedback" id="rescheduleFeedback"></p>
    </form>`;
    const dateInput = document.getElementById('newDate');
    const timeInput = document.getElementById('newTime');
    const result = document.getElementById('rescheduleFeedback');
    dateInput.value = appointment.date >= today() ? appointment.date : '';

    async function loadSlots() {
        timeInput.disabled = true;
        timeInput.innerHTML = '<option value="">Carregando horários...</option>';
        if (!dateInput.value) return;
        try {
            const availability = await request(`/availability?appointment_id=${id}&date=${dateInput.value}`);
            timeInput.innerHTML = availability.slots.length ? `<option value="">Selecione um horário</option>${availability.slots.map((slot) => `<option value="${slot}">${slot}</option>`).join('')}` : '<option value="">Não há horários disponíveis</option>';
            timeInput.disabled = !availability.slots.length;
        } catch (error) {
            timeInput.innerHTML = '<option value="">Não foi possível carregar horários</option>';
            result.textContent = error.message;
        }
    }

    dateInput.addEventListener('change', loadSlots);
    dialog.showModal();
    if (dateInput.value) loadSlots();
    document.getElementById('rescheduleForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        try {
            await request(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'reschedule', date: dateInput.value, start_time: timeInput.value }) });
            dialog.close();
            showSection('manage');
        } catch (error) { result.textContent = error.message; }
    });
}

document.querySelectorAll('[data-section]').forEach((button) => button.addEventListener('click', () => showSection(button.dataset.section)));
document.getElementById('accountDialogClose').addEventListener('click', () => dialog.close());

if (account) {
    request('/me').then((client) => enter({ ...account, client })).catch(() => {
        localStorage.removeItem('smf-account');
        account = null;
    });
}
