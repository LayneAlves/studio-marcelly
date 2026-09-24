const adminSidebar = document.getElementById('adminSidebar');
const adminMenuToggle = document.getElementById('adminMenuToggle');
const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
const adminMenuLinks = document.querySelectorAll('.admin-menu-link');
const adminContent = document.querySelector('.admin-content');
const dashboardView = document.getElementById('dashboardView');
const servicesView = document.getElementById('servicos');
const appointmentsView = document.getElementById('agendamentos');
const maintenancesView = document.getElementById('manutencoes');
const scheduleSettingsView = document.getElementById('configuracoes-agenda');
const scheduleSettingsForm = document.getElementById('scheduleSettingsForm');
const businessHoursList = document.getElementById('businessHoursList');
const scheduleSettingsFeedback = document.getElementById('scheduleSettingsFeedback');
const scheduleBlockForm = document.getElementById('scheduleBlockForm');
const scheduleBlockDate = document.getElementById('scheduleBlockDate');
const scheduleBlockStart = document.getElementById('scheduleBlockStart');
const scheduleBlockEnd = document.getElementById('scheduleBlockEnd');
const scheduleBlockReason = document.getElementById('scheduleBlockReason');
const scheduleBlockFeedback = document.getElementById('scheduleBlockFeedback');
const scheduleBlockList = document.getElementById('scheduleBlockList');
const scheduleBlockEmptyState = document.getElementById('scheduleBlockEmptyState');
const scheduleBlockCount = document.getElementById('scheduleBlockCount');
const serviceForm = document.getElementById('serviceForm');
const serviceIdInput = document.getElementById('serviceId');
const serviceNameInput = document.getElementById('serviceName');
const serviceValueInput = document.getElementById('serviceValue');
const serviceDurationInput = document.getElementById('serviceDuration');
const serviceDepositInput = document.getElementById('serviceDeposit');
const serviceMaintenanceDaysInput = document.getElementById('serviceMaintenanceDays');
const serviceSubmitButton = document.getElementById('serviceSubmitButton');
const serviceCancelEditButton = document.getElementById('serviceCancelEdit');
const serviceFormTitle = document.getElementById('serviceFormTitle');
const serviceList = document.getElementById('serviceList');
const serviceCount = document.getElementById('serviceCount');
const serviceEmptyState = document.getElementById('serviceEmptyState');
const serviceFeedback = document.getElementById('serviceFeedback');

const SERVICES_API_URL = `http://${window.location.hostname || '127.0.0.1'}:3000/api/admin/services`;
const SCHEDULE_SETTINGS_API_URL = `http://${window.location.hostname || '127.0.0.1'}:3000/api/admin/schedule-settings`;
const SCHEDULE_BLOCKS_API_URL = `http://${window.location.hostname || '127.0.0.1'}:3000/api/admin/schedule-blocks`;
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
    const isMaintenancesView = hash === '#manutencoes';
    const isScheduleSettingsView = hash === '#configuracoes-agenda';

    setActiveAdminLink(selectedLink);
    dashboardView.hidden = isServicesView || isAppointmentsView || isMaintenancesView || isScheduleSettingsView;
    servicesView.hidden = !isServicesView;
    appointmentsView.hidden = !isAppointmentsView;
    maintenancesView.hidden = !isMaintenancesView;
    scheduleSettingsView.hidden = !isScheduleSettingsView;
    adminContent.classList.toggle('is-services-view', isServicesView || isMaintenancesView || isScheduleSettingsView);
    adminContent.classList.toggle('is-admin-view', isServicesView || isAppointmentsView || isMaintenancesView || isScheduleSettingsView);

    if (isServicesView) loadServices();
    if (isAppointmentsView) loadAppointments();
    if (isMaintenancesView) loadMaintenances();
    if (isScheduleSettingsView) loadScheduleSettings();
}

function showServiceFeedback(message = '', isError = false) {
    serviceFeedback.textContent = message;
    serviceFeedback.classList.toggle('is-error', isError);
}

const scheduleWeekDays = [
    { id: 0, label: 'Domingo', shortLabel: 'Dom' },
    { id: 1, label: 'Segunda-feira', shortLabel: 'Seg' },
    { id: 2, label: 'Terça-feira', shortLabel: 'Ter' },
    { id: 3, label: 'Quarta-feira', shortLabel: 'Qua' },
    { id: 4, label: 'Quinta-feira', shortLabel: 'Qui' },
    { id: 5, label: 'Sexta-feira', shortLabel: 'Sex' },
    { id: 6, label: 'Sábado', shortLabel: 'Sáb' },
];

function scheduleRequest(url, options = {}) {
    return requestJson(url, options);
}

function showScheduleFeedback(target, message = '', isError = false) {
    target.textContent = message;
    target.classList.toggle('is-error', isError);
}

function setScheduleDayState(dayElement) {
    const isActive = dayElement.querySelector('[data-schedule-day-active]').checked;
    dayElement.classList.toggle('is-inactive', !isActive);
    dayElement.querySelectorAll('input[type="time"]').forEach((input) => input.disabled = !isActive);
    dayElement.querySelector('.schedule-day-status').textContent = isActive ? 'Aberto' : 'Fechado';
}

function renderScheduleSettings(settings) {
    const days = new Map((settings.days || []).map((day) => [Number(day.day_of_week), day]));
    businessHoursList.replaceChildren();

    scheduleWeekDays.forEach((weekDay) => {
        const current = days.get(weekDay.id) || { is_active: false, opening_time: '07:00', closing_time: '20:00' };
        const day = document.createElement('article');
        day.className = 'schedule-day';
        day.dataset.scheduleDay = String(weekDay.id);
        day.innerHTML = `<p class="schedule-day-name">${weekDay.label}</p><label class="schedule-day-switch" title="${current.is_active ? `Desativar ${weekDay.label}` : `Ativar ${weekDay.label}`}"><input type="checkbox" data-schedule-day-active ${current.is_active ? 'checked' : ''} aria-label="${current.is_active ? 'Desativar' : 'Ativar'} ${weekDay.label}"><span class="schedule-day-switch-track"></span></label><p class="schedule-day-status">${current.is_active ? 'Aberto' : 'Fechado'}</p><div class="schedule-day-times"><label class="schedule-time-field"><i class="fa-regular fa-clock" aria-hidden="true"></i><input type="time" data-schedule-opening value="${current.opening_time}" required aria-label="Horário de início de ${weekDay.label}"></label><span aria-hidden="true">às</span><label class="schedule-time-field"><i class="fa-regular fa-clock" aria-hidden="true"></i><input type="time" data-schedule-closing value="${current.closing_time}" required aria-label="Horário de fim de ${weekDay.label}"></label></div>`;
        day.querySelector('[data-schedule-day-active]').addEventListener('change', () => setScheduleDayState(day));
        setScheduleDayState(day);
        businessHoursList.append(day);
    });
}

function renderScheduleBlocks(blocks) {
    scheduleBlockList.replaceChildren();
    scheduleBlockCount.textContent = `${blocks.length} ${blocks.length === 1 ? 'bloqueio' : 'bloqueios'}`;
    scheduleBlockEmptyState.hidden = blocks.length > 0;

    blocks.forEach((block) => {
        const item = document.createElement('article');
        item.className = 'schedule-block-item';
        item.innerHTML = `<div class="schedule-block-date"><span class="schedule-block-icon"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span><div><p>${appointmentDateLabel(block.block_date)}</p><strong>${block.start_time} — ${block.end_time}</strong></div></div><p class="schedule-block-reason">${escapeHtml(block.reason || 'Horário reservado manualmente')}</p><button class="schedule-block-delete" type="button" data-schedule-block-id="${block.id}" aria-label="Excluir bloqueio de ${appointmentDateLabel(block.block_date)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Excluir</span></button>`;
        scheduleBlockList.append(item);
    });
}

async function loadScheduleBlocks() {
    const blocks = await scheduleRequest(SCHEDULE_BLOCKS_API_URL);
    renderScheduleBlocks(blocks);
}

async function loadScheduleSettings() {
    try {
        const [settings, blocks] = await Promise.all([
            scheduleRequest(SCHEDULE_SETTINGS_API_URL),
            scheduleRequest(SCHEDULE_BLOCKS_API_URL),
        ]);
        renderScheduleSettings(settings);
        renderScheduleBlocks(blocks);
        if (!scheduleBlockDate.value) scheduleBlockDate.value = new Date().toISOString().slice(0, 10);
        showScheduleFeedback(scheduleSettingsFeedback);
        showScheduleFeedback(scheduleBlockFeedback);
    } catch (error) {
        showScheduleFeedback(scheduleSettingsFeedback, error.message, true);
        showScheduleFeedback(scheduleBlockFeedback, error.message, true);
    }
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
            createServiceCell('Valor do sinal', service.deposit === null ? 'Não informado' : formatCurrency(service.deposit)),
            createServiceCell('Manutenção', service.maintenance_days ? `${service.maintenance_days} dias` : 'Não definida')
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
    serviceMaintenanceDaysInput.value = service.maintenance_days || '';
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


document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        setAdminMenuState(false);
        closeActionDropdowns();
    }
});

serviceForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = parseCurrency(serviceValueInput.value);
    const deposit = serviceDepositInput.value.trim() ? parseCurrency(serviceDepositInput.value) : null;
    const maintenanceDays = serviceMaintenanceDaysInput.value.trim() ? Number(serviceMaintenanceDaysInput.value) : null;

    if (value === null || deposit === null && serviceDepositInput.value.trim()) {
        const invalidInput = value === null ? serviceValueInput : serviceDepositInput;
        invalidInput.setCustomValidity('Informe um valor válido em reais.');
        invalidInput.reportValidity();
        invalidInput.setCustomValidity('');
        return;
    }

    if (maintenanceDays !== null && (!Number.isInteger(maintenanceDays) || maintenanceDays < 1 || maintenanceDays > 365)) {
        serviceMaintenanceDaysInput.setCustomValidity('Informe um número entre 1 e 365 dias.');
        serviceMaintenanceDaysInput.reportValidity();
        serviceMaintenanceDaysInput.setCustomValidity('');
        return;
    }

    const serviceData = {
        name: serviceNameInput.value.trim(),
        value,
        duration: serviceDurationInput.value.trim(),
        deposit,
        maintenance_days: maintenanceDays,
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
const maintenanceList = document.getElementById('maintenanceList');
const maintenanceEmptyState = document.getElementById('maintenanceEmptyState');

const ADMIN_API_URL = `http://${window.location.hostname || '127.0.0.1'}:3000/api`;
const APPOINTMENTS_API_URL = `${ADMIN_API_URL}/appointments`;
const CLIENTS_API_URL = `${ADMIN_API_URL}/clients`;
const MAINTENANCES_API_URL = `${ADMIN_API_URL}/maintenances`;
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

function maintenanceRequest(path = '', options = {}) { return requestJson(`${MAINTENANCES_API_URL}${path}`, options); }

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

const actionMenuIcons = {
    details: 'fa-regular fa-file-lines',
    reschedule: 'fa-regular fa-calendar-days',
    cancelled: 'fa-solid fa-xmark',
    no_show: 'fa-solid fa-triangle-exclamation',
    completed: 'fa-solid fa-check',
};

function actionDropdown({ id, context, label, items, triggerContent = '<span>Ações</span>', triggerClass = '', menuKey = '' }) {
    const menuId = `${context}-actions-${id}${menuKey ? `-${menuKey}` : ''}`;
    const menuItems = items.map((item) => `<button class="action-dropdown-item action-dropdown-item--${item.tone || 'neutral'}" type="button" role="menuitem" data-${context}-action="${item.action}" data-${context}-id="${id}"><i class="${actionMenuIcons[item.action]}" aria-hidden="true"></i><span>${item.label}</span></button>`).join('');
    return `<div class="action-dropdown" data-action-dropdown><button class="action-dropdown-toggle ${triggerClass}" type="button" data-action-dropdown-toggle aria-label="${escapeHtml(label)}" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}">${triggerContent}<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><div class="action-dropdown-menu" id="${menuId}" role="menu">${menuItems}</div></div>`;
}

function appointmentActions(appointment) {
    const items = [{ action: 'details', label: 'Detalhes' }];
    if (['pending', 'confirmed'].includes(appointment.status)) items.push({ action: 'reschedule', label: 'Remarcar', tone: 'reschedule' }, { action: 'cancelled', label: 'Cancelar', tone: 'danger' }, { action: 'no_show', label: 'Não compareceu', tone: 'warning' }, { action: 'completed', label: 'Concluir', tone: 'success' });
    if (appointment.status === 'in_progress') items.push({ action: 'cancelled', label: 'Cancelar', tone: 'danger' }, { action: 'completed', label: 'Concluir', tone: 'success' });
    return `${actionDropdown({ id: appointment.id, context: 'appointment', label: `Ações para ${appointment.client_name}`, items })}<button class="appointment-mobile-details" type="button" data-appointment-details="${appointment.id}">Ver mais</button>`;
}

const appointmentStatusIcons = {
    pending: 'fa-regular fa-clock',
    confirmed: 'fa-regular fa-circle-check',
    in_progress: 'fa-solid fa-spinner',
    completed: 'fa-solid fa-check',
    cancelled: 'fa-solid fa-xmark',
    no_show: 'fa-solid fa-triangle-exclamation',
};

function appointmentStatusControl(appointment, { includeDetails = false, includeReschedule = false, menuKey = 'modal-status' } = {}) {
    const transitions = {
        pending: [{ action: 'completed', label: 'Concluir', tone: 'success' }, { action: 'cancelled', label: 'Cancelar', tone: 'danger' }, { action: 'no_show', label: 'Não compareceu', tone: 'warning' }],
        confirmed: [{ action: 'completed', label: 'Concluir', tone: 'success' }, { action: 'cancelled', label: 'Cancelar', tone: 'danger' }, { action: 'no_show', label: 'Não compareceu', tone: 'warning' }],
        in_progress: [{ action: 'completed', label: 'Concluir', tone: 'success' }, { action: 'cancelled', label: 'Cancelar', tone: 'danger' }],
    };
    const status = appointment.status;
    const label = statusLabels[status] || status;
    const triggerContent = `<span><i class="${appointmentStatusIcons[status] || 'fa-regular fa-circle'}" aria-hidden="true"></i>${label}</span>`;
    const items = [...(transitions[status] || [])];
    if (includeDetails) items.unshift({ action: 'details', label: 'Detalhes' });
    if (includeReschedule && ['pending', 'confirmed'].includes(status)) items.splice(includeDetails ? 1 : 0, 0, { action: 'reschedule', label: 'Remarcar', tone: 'reschedule' });
    if (!items.length) return `<span class="appointment-status-toggle is-static status-${status}">${triggerContent}</span>`;
    return actionDropdown({ id: appointment.id, context: 'appointment', label: `Alterar status: ${label}`, items, triggerContent, triggerClass: `appointment-status-toggle status-${status}`, menuKey });
}

function renderAppointments() {
    appointmentList.replaceChildren();
    appointmentEmptyState.hidden = appointments.length > 0;
    appointments.forEach((appointment) => {
        const card = document.createElement('article');
        const initial = String(appointment.client_name || '?').trim().charAt(0).toUpperCase() || '?';
        card.className = 'appointment-card';
        card.innerHTML = `<header class="appointment-card-header"><div class="appointment-card-client"><span class="appointment-card-avatar" aria-hidden="true">${escapeHtml(initial)}</span><div><h3>${escapeHtml(appointment.client_name)}</h3><p>${escapeHtml(appointment.service_name)}</p></div></div><div class="appointment-card-status">${appointmentStatusControl(appointment, { includeDetails: true, includeReschedule: true, menuKey: 'card-status' })}</div></header><div class="appointment-card-divider" aria-hidden="true"></div><div class="appointment-card-body"><div class="appointment-card-data"><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-solid fa-phone" aria-hidden="true"></i></span><div><p>Telefone</p><strong>${escapeHtml(appointment.phone)}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span><div><p>Data</p><strong>${appointmentDateLabel(appointment.date)}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-regular fa-clock" aria-hidden="true"></i></span><div><p>Horário</p><strong>${appointment.start_time} — ${appointment.end_time}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span><div><p>Serviço</p><strong>${escapeHtml(appointment.service_name)}</strong></div></div></div><svg class="appointment-card-lashes" viewBox="0 0 170 50" aria-hidden="true"><path d="M18 38C45 15 72 15 98 38M45 38C61 20 77 20 92 38M100 38c16-14 31-14 47 0M57 30l-7-14M68 26l-3-16M80 25V9M92 26l4-16M104 29l8-14"/></svg></div><div class="appointment-card-divider" aria-hidden="true"></div><footer class="appointment-card-footer"><button class="appointment-card-details" type="button" data-appointment-details="${appointment.id}">Ver mais <span aria-hidden="true">›</span></button></footer>`;
        appointmentList.append(card);
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

const maintenanceStatusLabels = {
    awaiting: 'Aguardando',
    reminder_sent: 'Lembrete enviado',
    rescheduled: 'Já reagendou',
    cancelled: 'Cancelado',
};

function maintenanceDateTimeLabel(value) {
    if (!value) return 'Ainda não enviado';
    const parsed = new Date(String(value).replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? 'Ainda não enviado' : parsed.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function maintenanceBadge(status) {
    return `<span class="status-badge maintenance-status maintenance-status-${status}">${maintenanceStatusLabels[status] || 'Aguardando'}</span>`;
}

async function loadMaintenances() {
    try {
        const maintenances = await maintenanceRequest();
        renderMaintenances(maintenances);
    } catch (error) {
        maintenanceList.replaceChildren();
        maintenanceEmptyState.hidden = false;
        maintenanceEmptyState.textContent = error.message;
    }
}

function maintenanceActions(maintenance) {
    const items = [{ action: 'details', label: 'Detalhes' }];
    return `${actionDropdown({ id: maintenance.id, context: 'maintenance', label: `Ações para ${maintenance.client_name}`, items })}<button class="appointment-mobile-details" type="button" data-maintenance-details="${maintenance.id}">Ver mais</button>`;
}

function renderMaintenances(maintenances) {
    maintenanceList.replaceChildren();
    maintenanceEmptyState.hidden = maintenances.length > 0;
    maintenances.forEach((maintenance) => {
        const card = document.createElement('article');
        const initial = String(maintenance.client_name || '?').trim().charAt(0).toUpperCase() || '?';
        card.className = 'appointment-card maintenance-card';
        card.innerHTML = `<header class="appointment-card-header"><div class="appointment-card-client"><span class="appointment-card-avatar" aria-hidden="true">${escapeHtml(initial)}</span><div><h3>${escapeHtml(maintenance.client_name)}</h3><p>${escapeHtml(maintenance.service_name)}</p></div></div><div class="appointment-card-status">${maintenanceBadge(maintenance.status)}</div></header><div class="appointment-card-divider" aria-hidden="true"></div><div class="appointment-card-body"><div class="appointment-card-data"><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-solid fa-phone" aria-hidden="true"></i></span><div><p>Telefone</p><strong>${escapeHtml(maintenance.phone)}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span><div><p>Último atendimento</p><strong>${appointmentDateLabel(maintenance.last_appointment_date)}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-regular fa-clock" aria-hidden="true"></i></span><div><p>Data prevista</p><strong>${appointmentDateLabel(maintenance.maintenance_date)}</strong></div></div><div class="appointment-card-data-item"><span class="appointment-card-icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span><div><p>Serviço realizado</p><strong>${escapeHtml(maintenance.service_name)}</strong></div></div></div><svg class="appointment-card-lashes" viewBox="0 0 170 50" aria-hidden="true"><path d="M18 38C45 15 72 15 98 38M45 38C61 20 77 20 92 38M100 38c16-14 31-14 47 0M57 30l-7-14M68 26l-3-16M80 25V9M92 26l4-16M104 29l8-14"/></svg></div><div class="appointment-card-divider" aria-hidden="true"></div><footer class="appointment-card-footer"><button class="appointment-card-details" type="button" data-maintenance-details="${maintenance.id}">Ver mais <span aria-hidden="true">›</span></button></footer>`;
        maintenanceList.append(card);
    });
}

function whatsappNumber(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    const number = digits.startsWith('55') && (digits.length === 12 || digits.length === 13) ? digits : `55${digits}`;
    if (!/^55\d{10,11}$/.test(number)) throw new Error('O telefone desta cliente não está em um formato válido para WhatsApp.');
    return number;
}

function reminderMessage(maintenance) {
    const days = Number(maintenance.maintenance_days);
    const period = Number.isInteger(days) && days > 0 ? (days === 1 ? '1 dia' : `${days} dias`) : 'o período recomendado';
    return `Oi, ${maintenance.client_name}! Tudo bem ? Sua manutenção completa 15 dias ${appointmentDateLabel(maintenance.maintenance_date)}, após ${period}. Deseja agendar seu horário?`;
}

async function showMaintenanceDetails(id) {
    try {
        const maintenance = await maintenanceRequest(`?id=${encodeURIComponent(id)}`);
        const initial = String(maintenance.client_name || '?').trim().charAt(0).toUpperCase() || '?';
        openDialog(`<article class="booking-detail-modal maintenance-detail-modal"><header class="booking-detail-header"><div><p class="booking-detail-eyebrow">Studio Marcelly Freitas</p><h2>Detalhes da manutenção</h2><p class="booking-detail-service">${escapeHtml(maintenance.service_name)}</p></div><svg class="booking-detail-lashes" viewBox="0 0 170 50" aria-hidden="true"><path d="M18 38C45 15 72 15 98 38M45 38C61 20 77 20 92 38M100 38c16-14 31-14 47 0M57 30l-7-14M68 26l-3-16M80 25V9M92 26l4-16M104 29l8-14"/></svg></header><section class="booking-detail-card booking-detail-client-card"><div class="booking-detail-client"><span class="booking-detail-avatar" aria-hidden="true">${escapeHtml(initial)}</span><div><p class="booking-detail-label">Cliente</p><strong>${escapeHtml(maintenance.client_name)}</strong></div></div><div class="booking-detail-card-divider" aria-hidden="true"></div><div class="booking-detail-contact"><p><i class="fa-solid fa-phone" aria-hidden="true"></i><span>${escapeHtml(maintenance.phone)}</span></p><p><i class="fa-regular fa-envelope" aria-hidden="true"></i><span>${escapeHtml(maintenance.email || 'E-mail não informado')}</span></p></div></section><section class="booking-detail-card booking-detail-info-card"><p class="booking-detail-section-title">Informações da manutenção</p><div class="booking-detail-info-list"><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span><div><p class="booking-detail-label">Serviço realizado</p><strong>${escapeHtml(maintenance.service_name)}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span><div><p class="booking-detail-label">Último atendimento</p><strong>${appointmentDateLabel(maintenance.last_appointment_date)}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-clock" aria-hidden="true"></i></span><div><p class="booking-detail-label">Data prevista</p><strong id="maintenanceDateValue">${appointmentDateLabel(maintenance.maintenance_date)}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-bell" aria-hidden="true"></i></span><div><p class="booking-detail-label">Último lembrete</p><strong>${maintenanceDateTimeLabel(maintenance.reminder_sent_at)}</strong></div></div></div></section><footer class="booking-detail-footer"><section class="booking-detail-card booking-detail-meta-card"><p class="booking-detail-label">Status</p><div class="maintenance-detail-status">${maintenanceBadge(maintenance.status)}</div></section><section class="booking-detail-card booking-detail-meta-card"><p class="booking-detail-label">Manutenção recomendada</p><p class="booking-detail-created"><i class="fa-regular fa-hourglass-half" aria-hidden="true"></i><strong>${maintenance.maintenance_days} dias</strong></p></section></footer><section class="booking-detail-card maintenance-detail-date-card"><form class="maintenance-date-form" id="maintenanceDateForm"><label for="maintenanceDateInput">Alterar data prevista</label><div><input id="maintenanceDateInput" type="date" value="${maintenance.maintenance_date}" required><button class="maintenance-date-save" type="submit">Salvar data</button></div><p class="appointment-feedback" id="maintenanceDateFeedback"></p></form></section><div class="maintenance-reminder-action"><button class="maintenance-reminder-button" id="sendMaintenanceReminder" type="button" ${maintenance.status === 'cancelled' ? 'disabled' : ''}>Enviar lembrete agora</button><p class="appointment-feedback" id="maintenanceReminderFeedback"></p></div></article>`, 'appointment-details');

        document.getElementById('maintenanceDateForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const feedback = document.getElementById('maintenanceDateFeedback');
            try {
                const updated = await maintenanceRequest(`?id=${encodeURIComponent(maintenance.id)}`, { method: 'PATCH', body: JSON.stringify({ maintenance_date: document.getElementById('maintenanceDateInput').value }) });
                maintenance.maintenance_date = updated.maintenance_date;
                document.getElementById('maintenanceDateValue').textContent = appointmentDateLabel(updated.maintenance_date);
                feedback.classList.remove('is-error');
                feedback.textContent = 'Data prevista atualizada.';
                await loadMaintenances();
            } catch (error) {
                feedback.textContent = error.message;
                feedback.classList.add('is-error');
            }
        });

        document.getElementById('sendMaintenanceReminder').addEventListener('click', async () => {
            const feedback = document.getElementById('maintenanceReminderFeedback');
            try {
                window.open(`https://wa.me/${whatsappNumber(maintenance.phone)}?text=${encodeURIComponent(reminderMessage(maintenance))}`, '_blank');
                await maintenanceRequest(`?id=${encodeURIComponent(maintenance.id)}`, { method: 'PATCH', body: JSON.stringify({ action: 'reminder_sent' }) });
                feedback.classList.remove('is-error');
                feedback.textContent = 'Lembrete registrado agora.';
                await loadMaintenances();
            } catch (error) {
                feedback.textContent = error.message;
                feedback.classList.add('is-error');
            }
        });
    } catch (error) {
        alert(error.message);
    }
}

function openDialog(content, variant = '') {
    appointmentDialog.classList.toggle('is-appointment-details-dialog', variant === 'appointment-details');
    appointmentDialogContent.innerHTML = content;
    appointmentDialog.showModal();
}
function closeDialog() {
    if (appointmentDialog.open) appointmentDialog.close();
    appointmentDialog.classList.remove('is-appointment-details-dialog');
}

async function showAppointmentDetails(id) {
    try {
        const appointment = await appointmentRequest(`?id=${id}`);
        const remaining = appointment.price - (appointment.deposit || 0);
        const createdAt = new Date(appointment.created_at.replace(' ', 'T')).toLocaleString('pt-BR');
        openDialog(`<article class="booking-detail-modal"><header class="booking-detail-header"><div><p class="booking-detail-eyebrow">Studio Marcelly Freitas</p><h2>Detalhes do agendamento</h2><p class="booking-detail-service">${escapeHtml(appointment.service_name)}</p></div></header><section class="booking-detail-card booking-detail-client-card"><div class="booking-detail-client"><span class="booking-detail-avatar"><i class="fa-regular fa-user" aria-hidden="true"></i></span><div><p class="booking-detail-label">Cliente</p><strong>${escapeHtml(appointment.client_name)}</strong></div></div><div class="booking-detail-card-divider" aria-hidden="true"></div><div class="booking-detail-contact"><p><i class="fa-solid fa-phone" aria-hidden="true"></i><span>${escapeHtml(appointment.phone)}</span></p><p><i class="fa-regular fa-envelope" aria-hidden="true"></i><span>${escapeHtml(appointment.email || 'E-mail não informado')}</span></p></div></section><section class="booking-detail-card booking-detail-info-card"><p class="booking-detail-section-title">Informações do agendamento</p><div class="booking-detail-info-list"><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span><div><p class="booking-detail-label">Data</p><strong>${appointmentDateLabel(appointment.date)}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-clock" aria-hidden="true"></i></span><div><p class="booking-detail-label">Horário</p><strong>${appointment.start_time} — ${appointment.end_time}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-hourglass-half" aria-hidden="true"></i></span><div><p class="booking-detail-label">Duração</p><strong>${appointment.duration_minutes} minutos</strong></div></div></div></section><section class="booking-detail-card booking-detail-values-card"><div class="booking-detail-value"><span class="booking-detail-icon"><i class="fa-regular fa-credit-card" aria-hidden="true"></i></span><div><p class="booking-detail-label">Valor</p><strong>${formatCurrency(appointment.price)}</strong></div></div><div class="booking-detail-value"><span class="booking-detail-icon"><i class="fa-solid fa-money-bill-wave" aria-hidden="true"></i></span><div><p class="booking-detail-label">Sinal</p><strong>${appointment.deposit === null ? 'Não informado' : formatCurrency(appointment.deposit)}</strong></div></div><div class="booking-detail-value"><span class="booking-detail-icon"><i class="fa-solid fa-chart-line" aria-hidden="true"></i></span><div><p class="booking-detail-label">Valor restante</p><strong>${formatCurrency(remaining)}</strong></div></div></section><footer class="booking-detail-footer"><section class="booking-detail-card booking-detail-meta-card"><p class="booking-detail-label">Status</p><div class="booking-detail-status-control">${appointmentStatusControl(appointment)}</div></section><section class="booking-detail-card booking-detail-meta-card"><p class="booking-detail-label">Criado em</p><p class="booking-detail-created"><i class="fa-regular fa-clock" aria-hidden="true"></i><strong>${createdAt}</strong></p></section></footer></article>`, 'appointment-details');
    } catch (error) { alert(error.message); }
}

async function changeAppointmentStatus(id, status) {
    const label = statusLabels[status].toLowerCase(); if (status === 'cancelled' && !window.confirm('Cancelar este agendamento? O registro será mantido no histórico.')) return;
    try { await appointmentRequest(`?id=${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); await loadAppointments(); closeDialog(); } catch (error) { alert(error.message); }
}

function handleAppointmentAction(action, id) {
    const appointment = appointments.find((item) => item.id === id);
    closeActionDropdowns();
    if (action === 'details') showAppointmentDetails(id);
    if (action === 'reschedule' && appointment) openAppointmentForm(appointment);
    if (['cancelled', 'no_show', 'completed'].includes(action)) changeAppointmentStatus(id, action);
}

async function loadClientOptions(query = '') { const clients = await requestJson(`${CLIENTS_API_URL}?q=${encodeURIComponent(query)}`); const select = document.getElementById('appointmentClient'); if (!select) return; select.replaceChildren(new Option('Selecione uma cliente', '')); clients.forEach((client) => select.add(new Option(`${client.name} · ${client.phone}`, client.id))); }
function appointmentFormHtml(title, appointment = null) { const serviceOptions = appointmentServices.map((service) => `<option value="${service.id}" ${appointment?.service_id === service.id ? 'selected' : ''}>${escapeHtml(service.name)}</option>`).join(''); return `<h2>${title}</h2><form class="appointment-form" id="appointmentForm"><div class="wide"><label>Buscar cliente</label><input id="appointmentClientSearch" type="search" placeholder="Nome, telefone ou e-mail"></div><div class="wide"><label>Cliente</label><select id="appointmentClient"><option>Carregando clientes...</option></select></div><div class="wide"><button class="appointment-action" type="button" id="newClientToggle">Cadastrar nova cliente</button></div><div class="wide" id="newClientFields" hidden><label>Nome da cliente</label><input id="newClientName"><label>Telefone</label><input id="newClientPhone" type="tel" data-phone-mask><label>E-mail (opcional)</label><input id="newClientEmail" type="email"></div><div><label>Serviço</label><select id="appointmentService" required>${serviceOptions}</select></div><div><label>Data</label><input id="appointmentDate" type="date" value="${appointment?.date || ''}" required></div><div><label>Horário</label><select id="appointmentTime" required><option value="">Selecione data e serviço</option></select></div><div><label><input id="appointmentOverride" type="checkbox"> Permitir fora do horário padrão</label></div><div class="wide"><label>Observações</label><textarea id="appointmentNotes"></textarea></div><div class="appointment-form-actions"><button class="admin-button" type="submit">Salvar agendamento</button></div><p class="appointment-feedback" id="appointmentFormFeedback"></p></form>`; }

async function fillAppointmentSlots(excludeId = '') { const date = document.getElementById('appointmentDate').value; const serviceId = document.getElementById('appointmentService').value; const select = document.getElementById('appointmentTime'); if (!date || !serviceId) return; try { const data = await appointmentRequest(`?availability=1&date=${date}&service_id=${serviceId}${excludeId ? `&exclude_id=${excludeId}` : ''}`); select.replaceChildren(new Option('Selecione um horário', '')); data.slots.forEach((time) => select.add(new Option(time, time))); } catch (error) { select.replaceChildren(new Option(error.message, '')); } }
async function openAppointmentForm(appointment = null) { openDialog(appointmentFormHtml(appointment ? 'Remarcar agendamento' : 'Novo agendamento', appointment)); await loadClientOptions(); const form = document.getElementById('appointmentForm'); const clientSearch = document.getElementById('appointmentClientSearch'); const newFields = document.getElementById('newClientFields'); document.getElementById('newClientToggle').addEventListener('click', () => newFields.hidden = !newFields.hidden); clientSearch.addEventListener('input', () => loadClientOptions(clientSearch.value)); document.getElementById('appointmentDate').addEventListener('change', () => fillAppointmentSlots(appointment?.id)); document.getElementById('appointmentService').addEventListener('change', () => fillAppointmentSlots(appointment?.id)); if (appointment) { document.getElementById('appointmentTime').innerHTML = `<option value="${appointment.start_time}">${appointment.start_time}</option>`; } form.addEventListener('submit', async (event) => { event.preventDefault(); const feedback = document.getElementById('appointmentFormFeedback'); const payload = { client_id: document.getElementById('appointmentClient').value || null, client_name: document.getElementById('newClientName').value, phone: document.getElementById('newClientPhone').value, email: document.getElementById('newClientEmail').value, service_id: document.getElementById('appointmentService').value, date: document.getElementById('appointmentDate').value, start_time: document.getElementById('appointmentTime').value, notes: document.getElementById('appointmentNotes').value, allow_override: document.getElementById('appointmentOverride').checked }; try { await appointmentRequest(appointment ? `?id=${appointment.id}` : '', { method: appointment ? 'PUT' : 'POST', body: JSON.stringify(payload) }); closeDialog(); await loadAppointments(); } catch (error) { feedback.textContent = error.message; feedback.classList.add('is-error'); } }); }

function closeActionDropdowns(except = null) {
    document.querySelectorAll('[data-action-dropdown].is-open').forEach((dropdown) => {
        if (dropdown !== except) {
            dropdown.classList.remove('is-open');
            dropdown.querySelector('[data-action-dropdown-toggle]').setAttribute('aria-expanded', 'false');
        }
    });
}

document.addEventListener('click', (event) => {
    const toggle = event.target.closest('[data-action-dropdown-toggle]');
    if (toggle) {
        const dropdown = toggle.closest('[data-action-dropdown]');
        const shouldOpen = !dropdown.classList.contains('is-open');
        closeActionDropdowns(dropdown);
        dropdown.classList.toggle('is-open', shouldOpen);
        toggle.setAttribute('aria-expanded', String(shouldOpen));
        return;
    }
    if (!event.target.closest('[data-action-dropdown]')) closeActionDropdowns();
});

document.getElementById('newAppointmentButton').addEventListener('click', () => openAppointmentForm());
document.getElementById('appointmentDialogClose').addEventListener('click', closeDialog);
appointmentDialogContent.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-appointment-action]');
    if (actionButton) handleAppointmentAction(actionButton.dataset.appointmentAction, actionButton.dataset.appointmentId);
});
appointmentList.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-appointment-action]');
    if (actionButton) {
        const { appointmentAction: action, appointmentId: id } = actionButton.dataset;
        handleAppointmentAction(action, id);
        return;
    }
    const button = event.target.closest('[data-appointment-details]');
    if (button) showAppointmentDetails(button.dataset.appointmentDetails);
});
maintenanceList.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-maintenance-action]');
    if (actionButton) {
        closeActionDropdowns();
        if (actionButton.dataset.maintenanceAction === 'details') showMaintenanceDetails(actionButton.dataset.maintenanceId);
        return;
    }
    const button = event.target.closest('[data-maintenance-details]');
    if (button) showMaintenanceDetails(button.dataset.maintenanceDetails);
});
appointmentsCalendarView.addEventListener('click', (event) => { const button = event.target.closest('[data-id]'); if (button) showAppointmentDetails(button.dataset.id); });
document.querySelectorAll('[data-quick]').forEach((button) => button.addEventListener('click', () => { appointmentQuickFilter = button.dataset.quick; document.querySelectorAll('[data-quick]').forEach((item) => item.classList.toggle('is-active', item === button)); loadAppointments(); }));
[appointmentDateFilter, appointmentServiceFilter, appointmentStatusFilter].forEach((field) => field.addEventListener('change', () => { appointmentQuickFilter = ''; document.querySelectorAll('[data-quick]').forEach((item) => item.classList.remove('is-active')); loadAppointments(); }));
appointmentSearch.addEventListener('input', () => { clearTimeout(appointmentSearchTimer); appointmentSearchTimer = setTimeout(loadAppointments, 250); });
document.querySelectorAll('[data-appointment-view]').forEach((button) => button.addEventListener('click', () => { appointmentViewMode = button.dataset.appointmentView; document.querySelectorAll('[data-appointment-view]').forEach((item) => item.classList.toggle('is-active', item === button)); appointmentsListView.hidden = appointmentViewMode !== 'list'; appointmentsCalendarView.hidden = appointmentViewMode !== 'calendar'; }));

scheduleSettingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const days = [...businessHoursList.querySelectorAll('[data-schedule-day]')].map((day) => ({
        day_of_week: Number(day.dataset.scheduleDay),
        is_active: day.querySelector('[data-schedule-day-active]').checked,
        opening_time: day.querySelector('[data-schedule-opening]').value,
        closing_time: day.querySelector('[data-schedule-closing]').value,
    }));

    try {
        const saved = await scheduleRequest(SCHEDULE_SETTINGS_API_URL, {
            method: 'PUT',
            body: JSON.stringify({ days }),
        });
        renderScheduleSettings(saved);
        showScheduleFeedback(scheduleSettingsFeedback, 'Configurações salvas com sucesso.');
    } catch (error) {
        showScheduleFeedback(scheduleSettingsFeedback, error.message, true);
    }
});

scheduleBlockForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
        await scheduleRequest(SCHEDULE_BLOCKS_API_URL, {
            method: 'POST',
            body: JSON.stringify({
                block_date: scheduleBlockDate.value,
                start_time: scheduleBlockStart.value,
                end_time: scheduleBlockEnd.value,
                reason: scheduleBlockReason.value,
            }),
        });
        scheduleBlockForm.reset();
        scheduleBlockDate.value = new Date().toISOString().slice(0, 10);
        showScheduleFeedback(scheduleBlockFeedback, 'Horário bloqueado com sucesso.');
        await loadScheduleBlocks();
    } catch (error) {
        showScheduleFeedback(scheduleBlockFeedback, error.message, true);
    }
});

scheduleBlockList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-schedule-block-id]');
    if (!button || !window.confirm('Excluir este bloqueio manual?')) return;

    try {
        await scheduleRequest(`${SCHEDULE_BLOCKS_API_URL}?id=${encodeURIComponent(button.dataset.scheduleBlockId)}`, { method: 'DELETE' });
        showScheduleFeedback(scheduleBlockFeedback, 'Bloqueio excluído com sucesso.');
        await loadScheduleBlocks();
    } catch (error) {
        showScheduleFeedback(scheduleBlockFeedback, error.message, true);
    }
});

document.getElementById('scheduleBackButton').addEventListener('click', () => { window.location.hash = '#dashboard'; });

showAdminView(window.location.hash || '#dashboard');
