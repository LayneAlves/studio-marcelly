const adminSidebar = document.getElementById('adminSidebar');
const adminMenuToggle = document.getElementById('adminMenuToggle');
const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
const adminMenuLinks = document.querySelectorAll('.admin-menu-link');
const adminThemeToggles = document.querySelectorAll('.admin-theme-toggle');
const adminContent = document.querySelector('.admin-content');
const dashboardView = document.getElementById('dashboardView');
const servicesView = document.getElementById('servicos');
const appointmentsView = document.getElementById('agendamentos');
const serviceForm = document.getElementById('serviceForm');
const serviceIdInput = document.getElementById('serviceId');
const serviceNameInput = document.getElementById('serviceName');
const serviceValueInput = document.getElementById('serviceValue');
const serviceDurationInput = document.getElementById('serviceDuration');
const serviceDepositInput = document.getElementById('serviceDeposit');
const serviceSubmitButton = document.getElementById('serviceSubmitButton');
const serviceCancelEditButton = document.getElementById('serviceCancelEdit');
const serviceFormTitle = document.getElementById('serviceFormTitle');
const serviceList = document.getElementById('serviceList');
const serviceCount = document.getElementById('serviceCount');
const serviceEmptyState = document.getElementById('serviceEmptyState');
const serviceFeedback = document.getElementById('serviceFeedback');

const SERVICES_API_URL = 'api/services.php';
let services = [];

function setAdminMenuState(isOpen) {
    adminSidebar.classList.toggle('is-open', isOpen);
    adminMenuToggle.classList.toggle('is-open', isOpen);
    adminSidebarBackdrop.classList.toggle('is-visible', isOpen);
    adminMenuToggle.setAttribute('aria-expanded', String(isOpen));
    adminMenuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu administrativo' : 'Abrir menu administrativo');
}

function setActiveAdminLink(activeLink) {
    adminMenuLinks.forEach((item) => {
        item.classList.remove('is-active');
        item.removeAttribute('aria-current');
    });
    activeLink.classList.add('is-active');
    activeLink.setAttribute('aria-current', 'page');
}

function showAdminView(hash) {
    const selectedLink = Array.from(adminMenuLinks).find((link) => link.getAttribute('href') === hash)
        || document.querySelector('.admin-menu-link[href="#dashboard"]');
    const isServicesView = hash === '#servicos';
    const isAppointmentsView = hash === '#agendamentos';

    setActiveAdminLink(selectedLink);
    dashboardView.hidden = isServicesView || isAppointmentsView;
    servicesView.hidden = !isServicesView;
    appointmentsView.hidden = !isAppointmentsView;
    adminContent.classList.toggle('is-services-view', isServicesView);
    adminContent.classList.toggle('is-admin-view', isServicesView || isAppointmentsView);

    if (isServicesView) loadServices();
    if (isAppointmentsView) loadAppointments();
}

function showServiceFeedback(message = '', isError = false) {
    serviceFeedback.textContent = message;
    serviceFeedback.classList.toggle('is-error', isError);
}

async function requestServices(path = '', options = {}) {
    const response = await fetch(`${SERVICES_API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Não foi possível concluir a operação.');
    }
    return data;
}

async function loadServices() {
    try {
        services = await requestServices();
        renderServices();
        showServiceFeedback();
    } catch (error) {
        services = [];
        renderServices();
        showServiceFeedback(error.message, true);
    }
}

function parseCurrency(value) {
    const normalized = value
        .replace(/R\$/gi, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    const amount = Number(normalized);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatCurrencyTyping(input) {
    const digits = input.value.replace(/\D/g, '');
    const cents = Number(digits);

    input.value = cents ? formatCurrency(cents / 100) : '';
}

function resetServiceForm() {
    serviceForm.reset();
    serviceIdInput.value = '';
    serviceFormTitle.textContent = 'Cadastrar serviço';
    serviceSubmitButton.textContent = 'Cadastrar serviço';
    serviceCancelEditButton.hidden = true;
}

function createServiceCell(label, content) {
    const cell = document.createElement('td');
    cell.dataset.label = label;
    if (typeof content === 'string') cell.textContent = content;
    else cell.append(content);
    return cell;
}

function renderServices() {
    serviceList.replaceChildren();
    serviceCount.textContent = `${services.length} ${services.length === 1 ? 'serviço' : 'serviços'}`;
    serviceEmptyState.hidden = services.length > 0;

    services.forEach((service) => {
        const row = document.createElement('tr');
        row.classList.toggle('is-inactive', !service.active);
        row.append(
            createServiceCell('Nome do serviço', service.name),
            createServiceCell('Valor', formatCurrency(service.value)),
            createServiceCell('Duração', service.duration),
            createServiceCell('Valor do sinal', service.deposit === null ? 'Não informado' : formatCurrency(service.deposit))
        );

        const status = document.createElement('div');
        status.className = 'service-status';
        const switchLabel = document.createElement('label');
        switchLabel.className = 'service-switch';
        switchLabel.title = service.active ? 'Desativar serviço' : 'Ativar serviço';
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = service.active;
        toggle.setAttribute('aria-label', `${service.active ? 'Desativar' : 'Ativar'} ${service.name}`);
        toggle.addEventListener('change', () => toggleServiceStatus(service.id));
        const track = document.createElement('span');
        track.className = 'service-switch-track';
        switchLabel.append(toggle, track);
        const statusText = document.createElement('span');
        statusText.textContent = service.active ? 'Ativado' : 'Desativado';
        status.append(switchLabel, statusText);
        row.append(createServiceCell('Status', status));

        const actions = document.createElement('div');
        actions.className = 'service-actions';
        const editButton = document.createElement('button');
        editButton.className = 'service-action-button';
        editButton.type = 'button';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => editService(service.id));
        const deleteButton = document.createElement('button');
        deleteButton.className = 'service-action-button service-action-button-delete';
        deleteButton.type = 'button';
        deleteButton.textContent = 'Excluir';
        deleteButton.addEventListener('click', () => deleteService(service.id));
        actions.append(editButton, deleteButton);
        row.append(createServiceCell('Ações', actions));
        serviceList.append(row);
    });
}

async function toggleServiceStatus(id) {
    const service = services.find((item) => item.id === id);
    if (!service) return;

    try {
        const updatedService = await requestServices(`?id=${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ active: !service.active }),
        });
        services = services.map((item) => item.id === id ? updatedService : item);
        renderServices();
        showServiceFeedback(`Serviço ${updatedService.active ? 'ativado' : 'desativado'} com sucesso.`);
    } catch (error) {
        renderServices();
        showServiceFeedback(error.message, true);
    }
}

function editService(id) {
    const service = services.find((item) => item.id === id);
    if (!service) return;

    serviceIdInput.value = service.id;
    serviceNameInput.value = service.name;
    serviceValueInput.value = formatCurrency(service.value);
    serviceDurationInput.value = service.duration;
    serviceDepositInput.value = service.deposit === null ? '' : formatCurrency(service.deposit);
    serviceFormTitle.textContent = 'Editar serviço';
    serviceSubmitButton.textContent = 'Salvar alterações';
    serviceCancelEditButton.hidden = false;
    serviceNameInput.focus();
    serviceForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteService(id) {
    const service = services.find((item) => item.id === id);
    if (!service || !window.confirm(`Excluir o serviço “${service.name}”? Esta ação não pode ser desfeita.`)) return;

    try {
        await requestServices(`?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        services = services.filter((item) => item.id !== id);
        if (serviceIdInput.value === id) resetServiceForm();
        renderServices();
        showServiceFeedback('Serviço excluído com sucesso.');
    } catch (error) {
        showServiceFeedback(error.message, true);
    }
}

adminMenuToggle.addEventListener('click', () => {
    setAdminMenuState(!adminSidebar.classList.contains('is-open'));
});

adminSidebarBackdrop.addEventListener('click', () => setAdminMenuState(false));

adminMenuLinks.forEach((link) => {
    link.addEventListener('click', () => {
        showAdminView(link.getAttribute('href'));
        setAdminMenuState(false);
    });
});

adminThemeToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('smf-theme', nextTheme);
    });
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setAdminMenuState(false);
});

serviceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = parseCurrency(serviceValueInput.value);
    const deposit = serviceDepositInput.value.trim() ? parseCurrency(serviceDepositInput.value) : null;

    if (value === null || deposit === null && serviceDepositInput.value.trim()) {
        const invalidInput = value === null ? serviceValueInput : serviceDepositInput;
        invalidInput.setCustomValidity('Informe um valor válido em reais.');
        invalidInput.reportValidity();
        invalidInput.setCustomValidity('');
        return;
    }

    const serviceData = {
        name: serviceNameInput.value.trim(),
        value,
        duration: serviceDurationInput.value.trim(),
        deposit
    };

    try {
        const isEditing = Boolean(serviceIdInput.value);
        const savedService = await requestServices(isEditing ? `?id=${encodeURIComponent(serviceIdInput.value)}` : '', {
            method: isEditing ? 'PUT' : 'POST',
            body: JSON.stringify(serviceData),
        });
        services = isEditing
            ? services.map((service) => service.id === savedService.id ? savedService : service)
            : [savedService, ...services];
        resetServiceForm();
        renderServices();
        showServiceFeedback(isEditing ? 'Alterações salvas com sucesso.' : 'Serviço cadastrado com sucesso.');
    } catch (error) {
        showServiceFeedback(error.message, true);
    }
});

serviceCancelEditButton.addEventListener('click', resetServiceForm);
[serviceValueInput, serviceDepositInput].forEach((input) => {
    input.addEventListener('input', () => formatCurrencyTyping(input));
});

window.addEventListener('hashchange', () => showAdminView(window.location.hash));

const appointmentList = document.getElementById('appointmentList');
const appointmentEmptyState = document.getElementById('appointmentEmptyState');
const appointmentSearch = document.getElementById('appointmentSearch');
const appointmentDateFilter = document.getElementById('appointmentDateFilter');
const appointmentServiceFilter = document.getElementById('appointmentServiceFilter');
const appointmentStatusFilter = document.getElementById('appointmentStatusFilter');
const appointmentDialog = document.getElementById('appointmentDialog');
const appointmentDialogContent = document.getElementById('appointmentDialogContent');
const appointmentsCalendarView = document.getElementById('appointmentsCalendarView');
const appointmentsListView = document.getElementById('appointmentsListView');

const ADMIN_API_URL = `http://${window.location.hostname || '127.0.0.1'}:3000/api`;
const APPOINTMENTS_API_URL = `${ADMIN_API_URL}/appointments`;
const CLIENTS_API_URL = `${ADMIN_API_URL}/clients`;
const statusLabels = { pending: 'Pendente', confirmed: 'Confirmado', in_progress: 'Em atendimento', completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Não compareceu' };
let appointments = [];
let appointmentServices = [];
let appointmentQuickFilter = '';
let appointmentViewMode = 'list';
let appointmentSearchTimer;

function escapeHtml(value = '') { const element = document.createElement('div'); element.textContent = value ?? ''; return element.innerHTML; }
function appointmentDateLabel(value) { return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
function appointmentRequest(path = '', options = {}) { return requestJson(`${APPOINTMENTS_API_URL}${path}`, options); }
async function requestJson(url, options = {}) { const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.'); return data; }

async function loadAppointmentServices() {
    appointmentServices = await requestJson(`${ADMIN_API_URL}/services`);
    appointmentServiceFilter.replaceChildren(new Option('Todos os serviços', ''));
    appointmentServices.forEach((service) => appointmentServiceFilter.add(new Option(service.name, service.id)));
}

async function loadAppointments() {
    try {
        if (!appointmentServices.length) await loadAppointmentServices();
        const params = new URLSearchParams();
        if (appointmentQuickFilter) params.set('quick', appointmentQuickFilter);
        if (appointmentSearch.value.trim()) params.set('q', appointmentSearch.value.trim());
        if (appointmentDateFilter.value) params.set('date', appointmentDateFilter.value);
        if (appointmentServiceFilter.value) params.set('service_id', appointmentServiceFilter.value);
        if (appointmentStatusFilter.value) params.set('status', appointmentStatusFilter.value);
        appointments = await appointmentRequest(`?${params}`);
        renderAppointments();
    } catch (error) { appointmentList.replaceChildren(); appointmentEmptyState.hidden = false; appointmentEmptyState.textContent = error.message; }
}

function appointmentActions(appointment) {
    const options = ['<option value="">Ações</option>', '<option value="details">Detalhes</option>'];
    if (['pending', 'confirmed'].includes(appointment.status)) options.push('<option value="reschedule">Remarcar</option>', '<option value="cancelled">Cancelar</option>', '<option value="no_show">Não compareceu</option>', '<option value="completed">Concluir</option>');
    if (appointment.status === 'in_progress') options.push('<option value="cancelled">Cancelar</option>', '<option value="completed">Concluir</option>');
    return `<select class="appointment-actions-select" data-id="${appointment.id}" aria-label="Ações para ${escapeHtml(appointment.client_name)}">${options.join('')}</select>`;
}

function renderAppointments() {
    appointmentList.replaceChildren(); appointmentEmptyState.hidden = appointments.length > 0;
    appointments.forEach((appointment) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td data-label="Cliente">${escapeHtml(appointment.client_name)}</td><td class="appointment-mobile-phone" data-label="Número">${escapeHtml(appointment.phone)}</td><td data-label="Serviço">${escapeHtml(appointment.service_name)}</td><td data-label="Data e horário">${appointmentDateLabel(appointment.date)}<br><small>${appointment.start_time} – ${appointment.end_time}</small></td><td data-label="Status"><span class="status-badge status-${appointment.status}">${statusLabels[appointment.status]}</span></td><td data-label="Ações"><div class="appointment-actions">${appointmentActions(appointment)}</div></td>`;
        appointmentList.append(row);
    });
    renderAppointmentCalendar();
}

function renderAppointmentCalendar() {
    appointmentsCalendarView.replaceChildren();
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - start.getDay());
    for (let offset = 0; offset < 7; offset++) {
        const day = new Date(start); day.setDate(start.getDate() + offset); const key = day.toISOString().slice(0, 10);
        const column = document.createElement('div'); column.className = 'calendar-day-column'; column.innerHTML = `<h3>${day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}</h3>`;
        appointments.filter((appointment) => appointment.date === key).forEach((appointment) => { const button = document.createElement('button'); button.className = 'calendar-item'; button.dataset.id = appointment.id; button.innerHTML = `${appointment.start_time} · ${escapeHtml(appointment.client_name)}<span>${escapeHtml(appointment.service_name)}</span>`; column.append(button); });
        appointmentsCalendarView.append(column);
    }
}

function openDialog(content) { appointmentDialogContent.innerHTML = content; appointmentDialog.showModal(); }
function closeDialog() { if (appointmentDialog.open) appointmentDialog.close(); }

async function showAppointmentDetails(id) {
    try { const appointment = await appointmentRequest(`?id=${id}`); const remaining = appointment.price - (appointment.deposit || 0);
        openDialog(`<h2>Detalhes do agendamento</h2><p class="admin-page-heading">${escapeHtml(appointment.service_name)}</p><dl class="appointment-details"><div><dt>Cliente</dt><dd>${escapeHtml(appointment.client_name)}</dd></div><div><dt>Telefone</dt><dd>${escapeHtml(appointment.phone)}</dd></div><div><dt>E-mail</dt><dd>${escapeHtml(appointment.email || 'Não informado')}</dd></div><div><dt>Data</dt><dd>${appointmentDateLabel(appointment.date)}</dd></div><div><dt>Horário</dt><dd>${appointment.start_time} – ${appointment.end_time}</dd></div><div><dt>Duração</dt><dd>${appointment.duration_minutes} minutos</dd></div><div><dt>Valor</dt><dd>${formatCurrency(appointment.price)}</dd></div><div><dt>Sinal</dt><dd>${appointment.deposit === null ? 'Não informado' : formatCurrency(appointment.deposit)}</dd></div><div><dt>Valor restante</dt><dd>${formatCurrency(remaining)}</dd></div><div><dt>Status</dt><dd><span class="status-badge status-${appointment.status}">${statusLabels[appointment.status]}</span></dd></div><div><dt>Criado em</dt><dd>${new Date(appointment.created_at.replace(' ', 'T')).toLocaleString('pt-BR')}</dd></div></dl>`);
    } catch (error) { alert(error.message); }
}

async function changeAppointmentStatus(id, status) {
    const label = statusLabels[status].toLowerCase(); if (status === 'cancelled' && !window.confirm('Cancelar este agendamento? O registro será mantido no histórico.')) return;
    try { await appointmentRequest(`?id=${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadAppointments(); closeDialog(); } catch (error) { alert(error.message); }
}

async function loadClientOptions(query = '') { const clients = await requestJson(`${CLIENTS_API_URL}?q=${encodeURIComponent(query)}`); const select = document.getElementById('appointmentClient'); if (!select) return; select.replaceChildren(new Option('Selecione uma cliente', '')); clients.forEach((client) => select.add(new Option(`${client.name} · ${client.phone}`, client.id))); }
function appointmentFormHtml(title, appointment = null) { const serviceOptions = appointmentServices.map((service) => `<option value="${service.id}" ${appointment?.service_id === service.id ? 'selected' : ''}>${escapeHtml(service.name)}</option>`).join(''); return `<h2>${title}</h2><form class="appointment-form" id="appointmentForm"><div class="wide"><label>Buscar cliente</label><input id="appointmentClientSearch" type="search" placeholder="Nome, telefone ou e-mail"></div><div class="wide"><label>Cliente</label><select id="appointmentClient"><option>Carregando clientes...</option></select></div><div class="wide"><button class="appointment-action" type="button" id="newClientToggle">Cadastrar nova cliente</button></div><div class="wide" id="newClientFields" hidden><label>Nome da cliente</label><input id="newClientName"><label>Telefone</label><input id="newClientPhone"><label>E-mail (opcional)</label><input id="newClientEmail" type="email"></div><div><label>Serviço</label><select id="appointmentService" required>${serviceOptions}</select></div><div><label>Data</label><input id="appointmentDate" type="date" value="${appointment?.date || ''}" required></div><div><label>Horário</label><select id="appointmentTime" required><option value="">Selecione data e serviço</option></select></div><div><label><input id="appointmentOverride" type="checkbox"> Permitir fora do horário padrão</label></div><div class="wide"><label>Observações</label><textarea id="appointmentNotes"></textarea></div><div class="appointment-form-actions"><button class="admin-button" type="submit">Salvar agendamento</button></div><p class="appointment-feedback" id="appointmentFormFeedback"></p></form>`; }

async function fillAppointmentSlots(excludeId = '') { const date = document.getElementById('appointmentDate').value; const serviceId = document.getElementById('appointmentService').value; const select = document.getElementById('appointmentTime'); if (!date || !serviceId) return; try { const data = await appointmentRequest(`?availability=1&date=${date}&service_id=${serviceId}${excludeId ? `&exclude_id=${excludeId}` : ''}`); select.replaceChildren(new Option('Selecione um horário', '')); data.slots.forEach((time) => select.add(new Option(time, time))); } catch (error) { select.replaceChildren(new Option(error.message, '')); } }
async function openAppointmentForm(appointment = null) { openDialog(appointmentFormHtml(appointment ? 'Remarcar agendamento' : 'Novo agendamento', appointment)); await loadClientOptions(); const form = document.getElementById('appointmentForm'); const clientSearch = document.getElementById('appointmentClientSearch'); const newFields = document.getElementById('newClientFields'); document.getElementById('newClientToggle').addEventListener('click', () => newFields.hidden = !newFields.hidden); clientSearch.addEventListener('input', () => loadClientOptions(clientSearch.value)); document.getElementById('appointmentDate').addEventListener('change', () => fillAppointmentSlots(appointment?.id)); document.getElementById('appointmentService').addEventListener('change', () => fillAppointmentSlots(appointment?.id)); if (appointment) { document.getElementById('appointmentTime').innerHTML = `<option value="${appointment.start_time}">${appointment.start_time}</option>`; } form.addEventListener('submit', async (event) => { event.preventDefault(); const feedback = document.getElementById('appointmentFormFeedback'); const payload = { client_id: document.getElementById('appointmentClient').value || null, client_name: document.getElementById('newClientName').value, phone: document.getElementById('newClientPhone').value, email: document.getElementById('newClientEmail').value, service_id: document.getElementById('appointmentService').value, date: document.getElementById('appointmentDate').value, start_time: document.getElementById('appointmentTime').value, notes: document.getElementById('appointmentNotes').value, allow_override: document.getElementById('appointmentOverride').checked }; try { await appointmentRequest(appointment ? `?id=${appointment.id}` : '', { method: appointment ? 'PUT' : 'POST', body: JSON.stringify(payload) }); closeDialog(); await loadAppointments(); } catch (error) { feedback.textContent = error.message; feedback.classList.add('is-error'); } }); }

document.getElementById('newAppointmentButton').addEventListener('click', () => openAppointmentForm());
document.getElementById('appointmentDialogClose').addEventListener('click', closeDialog);
appointmentList.addEventListener('change', (event) => { const select = event.target.closest('.appointment-actions-select'); if (!select || !select.value) return; const appointment = appointments.find((item) => item.id === select.dataset.id); const action = select.value; select.value = ''; if (action === 'details') showAppointmentDetails(select.dataset.id); if (action === 'reschedule' && appointment) openAppointmentForm(appointment); if (['cancelled', 'no_show', 'completed'].includes(action)) changeAppointmentStatus(select.dataset.id, action); });
appointmentsCalendarView.addEventListener('click', (event) => { const button = event.target.closest('[data-id]'); if (button) showAppointmentDetails(button.dataset.id); });
document.querySelectorAll('[data-quick]').forEach((button) => button.addEventListener('click', () => { appointmentQuickFilter = button.dataset.quick; document.querySelectorAll('[data-quick]').forEach((item) => item.classList.toggle('is-active', item === button)); loadAppointments(); }));
[appointmentDateFilter, appointmentServiceFilter, appointmentStatusFilter].forEach((field) => field.addEventListener('change', () => { appointmentQuickFilter = ''; document.querySelectorAll('[data-quick]').forEach((item) => item.classList.remove('is-active')); loadAppointments(); }));
appointmentSearch.addEventListener('input', () => { clearTimeout(appointmentSearchTimer); appointmentSearchTimer = setTimeout(loadAppointments, 250); });
document.querySelectorAll('[data-appointment-view]').forEach((button) => button.addEventListener('click', () => { appointmentViewMode = button.dataset.appointmentView; document.querySelectorAll('[data-appointment-view]').forEach((item) => item.classList.toggle('is-active', item === button)); appointmentsListView.hidden = appointmentViewMode !== 'list'; appointmentsCalendarView.hidden = appointmentViewMode !== 'calendar'; }));

showAdminView(window.location.hash || '#dashboard');
