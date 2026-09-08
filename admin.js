const adminSidebar = document.getElementById('adminSidebar');
const adminMenuToggle = document.getElementById('adminMenuToggle');
const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
const adminMenuLinks = document.querySelectorAll('.admin-menu-link');
const adminThemeToggles = document.querySelectorAll('.admin-theme-toggle');
const adminContent = document.querySelector('.admin-content');
const dashboardView = document.getElementById('dashboardView');
const servicesView = document.getElementById('servicos');
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

    setActiveAdminLink(selectedLink);
    dashboardView.hidden = isServicesView;
    servicesView.hidden = !isServicesView;
    adminContent.classList.toggle('is-services-view', isServicesView);

    if (isServicesView) loadServices();
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

showAdminView(window.location.hash || '#dashboard');
