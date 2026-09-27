const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

revealEls.forEach((element) => revealObserver.observe(element));

const galleryItems = [
    { cat: 'mega-brasileiro', label: 'Mega Brasileiro', img: '/images/cilios-imagens/mega-brasileiro.png' },
    { cat: 'volume-4D', label: 'Volume 4D', img: '/images/cilios-imagens/volume-4D.png' },
    { cat: 'volume-6D', label: 'Volume 6D', img: '/images/cilios-imagens/volume-6D.png' },
    { cat: 'volume-brasileiro', label: 'Volume Brasileiro', img: '/images/cilios-imagens/volume-brasileiro.png' },
    { cat: 'volume-fox', label: 'Volume Fox', img: '/images/cilios-imagens/volume-fox.png' },
    { cat: 'volume-hibrido', label: 'Volume Híbrido', img: '/images/cilios-imagens/volume-hibrido.png' },
    { cat: 'volume-princesa', label: 'Volume Princesa', img: '/images/cilios-imagens/volume-princesa.png' },
    { cat: 'volume-russo', label: 'Volume Russo', img: '/images/cilios-imagens/volume-russo.png' },
];

const galleryGrid = document.getElementById('galleryGrid');

function renderGallery(filter) {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '';
    const items = filter === 'todas' ? galleryItems : galleryItems.filter((item) => item.cat === filter);
    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.innerHTML = `<div class="gallery-thumb"><img src="${item.img}" alt="${item.label}"></div><div class="gallery-info"><h4>${item.label}</h4></div>`;
        galleryGrid.appendChild(card);
        requestAnimationFrame(() => card.classList.add('show'));
    });
}
if (galleryGrid) {
    renderGallery('todas');
    document.querySelectorAll('.tab-btn').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach((tab) => tab.classList.remove('active'));
            button.classList.add('active');
            renderGallery(button.dataset.filter);
        });
    });
}

const SERVICES_API_URL = '/api/services';
const APPOINTMENTS_API_URL = '/api/appointments';
const ACCOUNT_API_URL = '/api/account';
const SCHEDULE_SETTINGS_API_URL = '/api/schedule-settings';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const calDaysEl = document.getElementById('calDays');
const calMonthLabel = document.getElementById('calMonthLabel');
const slotsGrid = document.getElementById('slotsGrid');
const slotsLabel = document.getElementById('slotsLabel');
const bookingSummary = document.getElementById('bookingSummary');
const bookingForm = document.getElementById('bookingForm');
const formMsg = document.getElementById('formMsg');
const serviceSelect = document.getElementById('servico');
const bookingServiceDropdown = document.getElementById('bookingServiceDropdown');
const bookingServiceToggle = document.getElementById('bookingServiceToggle');
const bookingServiceValue = document.getElementById('bookingServiceValue');
const bookingServiceMenu = document.getElementById('bookingServiceMenu');
const publicBusinessHours = document.getElementById('publicBusinessHours');

const publicWeekDays = [
    { id: 1, label: 'Segunda-feira' },
    { id: 2, label: 'Terça-feira' },
    { id: 3, label: 'Quarta-feira' },
    { id: 4, label: 'Quinta-feira' },
    { id: 5, label: 'Sexta-feira' },
    { id: 6, label: 'Sábado' },
    { id: 0, label: 'Domingo' },
];

let scheduleDays = new Map([
    [1, { is_active: false, opening_time: '07:00', closing_time: '20:00' }],
    [2, { is_active: true, opening_time: '07:00', closing_time: '20:00' }],
    [3, { is_active: true, opening_time: '07:00', closing_time: '20:00' }],
    [4, { is_active: true, opening_time: '07:00', closing_time: '20:00' }],
    [5, { is_active: true, opening_time: '07:00', closing_time: '20:00' }],
    [6, { is_active: true, opening_time: '08:00', closing_time: '18:00' }],
    [0, { is_active: true, opening_time: '08:00', closing_time: '14:00' }],
]);

let calDate = new Date();
let selectedDate = null;
let selectedTime = null;
let selectedService = null;
let activeServices = [];
let slotsRequestVersion = 0;
let authModalContext = { source: 'booking', booking: null };

function isPast(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function scheduleDay(date) {
    return scheduleDays.get(date.getDay()) || { is_active: false, opening_time: '', closing_time: '' };
}

function renderPublicBusinessHours() {
    if (!publicBusinessHours) return;
    publicBusinessHours.replaceChildren();
    publicBusinessHours.setAttribute('aria-busy', 'false');

    publicWeekDays.forEach((weekDay) => {
        const day = scheduleDays.get(weekDay.id) || { is_active: false, opening_time: '', closing_time: '' };
        const row = document.createElement('div');
        row.className = 'business-hours-row';

        const name = document.createElement('span');
        name.className = 'business-hours-day';
        name.textContent = weekDay.label;

        const status = document.createElement('span');
        status.className = `business-hours-status ${day.is_active ? 'is-open' : 'is-closed'}`;
        status.textContent = day.is_active ? 'Aberto' : 'Fechado';

        const hours = document.createElement('span');
        hours.className = `business-hours-time${day.is_active ? '' : ' is-closed'}`;
        hours.textContent = day.is_active ? `${day.opening_time} às ${day.closing_time}` : 'Fechado';

        row.append(name, status, hours);
        publicBusinessHours.append(row);
    });
}

async function loadPublicBusinessHours() {
    if (!publicBusinessHours) return;

    try {
        const response = await fetch(SCHEDULE_SETTINGS_API_URL, { cache: 'no-store' });
        const settings = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(settings.days)) throw new Error(settings.error || 'Não foi possível carregar os horários.');
        scheduleDays = new Map(settings.days.map((day) => [Number(day.day_of_week), day]));
        renderPublicBusinessHours();
        renderCalendar();
    } catch (error) {
        publicBusinessHours.setAttribute('aria-busy', 'false');
        publicBusinessHours.replaceChildren();
        const message = document.createElement('p');
        message.className = 'business-hours-error';
        message.textContent = error.message;
        publicBusinessHours.append(message);
    }
}

async function appointmentRequest(path = '', options = {}) {
    const response = await fetch(`${APPOINTMENTS_API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível consultar os horários.');
    return data;
}

async function accountRequest(path = '', options = {}) {
    const session = JSON.parse(localStorage.getItem('smf-account') || 'null');
    const response = await fetch(`${ACCOUNT_API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
        ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem('smf-account');
            if (typeof updateSharedAccountLink === 'function') updateSharedAccountLink();
        }
        const error = new Error(data.error || 'Não foi possível concluir esta ação.');
        error.status = response.status;
        error.fields = data.fields || {};
        throw error;
    }
    return data;
}

function closeBookingServiceDropdown() {
    if (!bookingServiceDropdown || !bookingServiceToggle) return;
    bookingServiceDropdown.classList.remove('is-open');
    bookingServiceToggle.setAttribute('aria-expanded', 'false');
}

function syncBookingServiceDropdown() {
    if (!bookingServiceDropdown || !bookingServiceToggle || !bookingServiceValue || !bookingServiceMenu || !serviceSelect) return;

    const selectedId = serviceSelect.value;
    const selectedServiceItem = activeServices.find((service) => String(service.id) === selectedId);
    const placeholder = serviceSelect.options[0]?.textContent || 'Selecione um serviço';
    bookingServiceValue.textContent = selectedServiceItem
        ? `${selectedServiceItem.name} — ${formatCurrency(selectedServiceItem.value)}`
        : placeholder;

    bookingServiceToggle.disabled = serviceSelect.disabled;
    bookingServiceDropdown.classList.toggle('is-disabled', serviceSelect.disabled);
    bookingServiceMenu.replaceChildren();

    activeServices.forEach((service) => {
        const option = document.createElement('button');
        const isSelected = String(service.id) === selectedId;
        option.type = 'button';
        option.className = 'booking-service-dropdown-item';
        option.dataset.serviceId = service.id;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(isSelected));
        option.classList.toggle('is-active', isSelected);
        option.textContent = `${service.name} — ${formatCurrency(service.value)}`;
        bookingServiceMenu.append(option);
    });
}

function selectBookingService(serviceId) {
    if (!serviceSelect || serviceSelect.disabled) return;
    serviceSelect.value = String(serviceId);
    serviceSelect.dispatchEvent(new Event('change', { bubbles: true }));
    closeBookingServiceDropdown();
}

function initializeBookingServiceDropdown() {
    if (!bookingServiceDropdown || !bookingServiceToggle || !bookingServiceMenu) return;

    bookingServiceToggle.addEventListener('click', () => {
        if (bookingServiceToggle.disabled) return;
        const willOpen = !bookingServiceDropdown.classList.contains('is-open');
        bookingServiceDropdown.classList.toggle('is-open', willOpen);
        bookingServiceToggle.setAttribute('aria-expanded', String(willOpen));
    });

    bookingServiceMenu.addEventListener('click', (event) => {
        const option = event.target.closest('[data-service-id]');
        if (option) selectBookingService(option.dataset.serviceId);
    });

    document.addEventListener('click', (event) => {
        if (!bookingServiceDropdown.contains(event.target)) closeBookingServiceDropdown();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeBookingServiceDropdown();
    });
}

async function loadActiveServices() {
    try {
        const response = await fetch(SERVICES_API_URL, { cache: 'no-store' });
        const services = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(services)) {
            throw new Error(services.error || 'Não foi possível carregar os serviços.');
        }

        activeServices = services;
        serviceSelect.replaceChildren(new Option('Selecione um serviço', ''));
        activeServices.forEach((service) => {
            serviceSelect.add(new Option(`${service.name} — ${formatCurrency(service.value)}`, service.id));
        });
        serviceSelect.disabled = activeServices.length === 0;
        syncBookingServiceDropdown();
        if (activeServices.length === 0) {
            serviceSelect.options[0].textContent = 'Nenhum serviço disponível';
            formMsg.textContent = 'Não há serviços ativos disponíveis para agendamento.';
        }
    } catch (error) {
        serviceSelect.replaceChildren(new Option('Não foi possível carregar os serviços', ''));
        serviceSelect.disabled = true;
        syncBookingServiceDropdown();
        formMsg.textContent = error.message;
    }
}

function renderCalendar() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    calMonthLabel.textContent = `${MESES[month]} de ${year}`;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    calDaysEl.replaceChildren();

    for (let index = 0; index < firstDay; index++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        calDaysEl.appendChild(empty);
    }

    if (selectedDate && !scheduleDay(selectedDate).is_active) {
        selectedDate = null;
        selectedTime = null;
        updateSummary();
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayElement = document.createElement('div');
        dayElement.className = 'cal-day';
        dayElement.textContent = day;

        if (isPast(date)) {
            dayElement.classList.add('past');
        } else if (!scheduleDay(date).is_active) {
            dayElement.classList.add('blocked');
            dayElement.title = 'O studio não atende neste dia';
        } else {
            dayElement.addEventListener('click', () => selectDate(date, dayElement));
        }

        if (selectedDate && selectedDate.getTime() === date.getTime()) {
            dayElement.classList.add('selected');
        }
        calDaysEl.appendChild(dayElement);
    }
}

function selectDate(date, element) {
    document.querySelectorAll('.cal-day.selected').forEach((day) => day.classList.remove('selected'));
    element.classList.add('selected');
    selectedDate = date;
    selectedTime = null;
    renderSlots();
    updateSummary();
}

async function renderSlots() {
    const requestVersion = ++slotsRequestVersion;
    slotsGrid.replaceChildren();

    if (!selectedService) {
        slotsLabel.textContent = 'Selecione um serviço para ver os horários';
        return;
    }
    if (!selectedDate) {
        slotsLabel.textContent = 'Selecione uma data para ver os horários';
        return;
    }

    slotsLabel.textContent = 'Consultando horários disponíveis...';
    try {
        const availability = await appointmentRequest(`?availability=1&date=${dateKey(selectedDate)}&service_id=${encodeURIComponent(selectedService.id)}`);
        if (requestVersion !== slotsRequestVersion) return;

        slotsLabel.textContent = 'Horários disponíveis';
        if (!availability.slots.length) {
            const empty = document.createElement('p');
            empty.className = 'slots-empty';
            empty.textContent = 'Não há horários disponíveis nesta data para este serviço.';
            slotsGrid.appendChild(empty);
            return;
        }

        availability.slots.forEach((time) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'slot-btn';
            button.textContent = time;
            button.addEventListener('click', () => {
                document.querySelectorAll('.slot-btn.selected').forEach((slot) => slot.classList.remove('selected'));
                button.classList.add('selected');
                selectedTime = time;
                updateSummary();
            });
            slotsGrid.appendChild(button);
        });
    } catch (error) {
        if (requestVersion !== slotsRequestVersion) return;
        slotsLabel.textContent = error.message;
    }
}

function updateSummary() {
    if (!selectedService) {
        bookingSummary.textContent = 'Selecione um serviço para iniciar o agendamento.';
    } else if (selectedDate && selectedTime) {
        const date = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        bookingSummary.textContent = `${selectedService.name}: ${date} às ${selectedTime}`;
    } else if (selectedDate) {
        const date = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        bookingSummary.textContent = `${selectedService.name}: ${date} — escolha um horário`;
    } else {
        bookingSummary.textContent = `${selectedService.name}: escolha uma data.`;
    }
}

if (bookingForm && calDaysEl && calMonthLabel && slotsGrid && slotsLabel && bookingSummary && serviceSelect) {
    document.getElementById('prevMonth').addEventListener('click', () => {
        calDate.setMonth(calDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        calDate.setMonth(calDate.getMonth() + 1);
        renderCalendar();
    });
    serviceSelect.addEventListener('change', () => {
        selectedService = activeServices.find((service) => String(service.id) === serviceSelect.value) || null;
        selectedTime = null;
        formMsg.textContent = '';
        syncBookingServiceDropdown();
        renderCalendar();
        renderSlots();
        updateSummary();
    });

    bookingForm.addEventListener('legacy-submit', async (event) => {
        event.preventDefault();
        if (!selectedService || !selectedDate || !selectedTime) {
            formMsg.textContent = 'Selecione um serviço, uma data e um horário antes de continuar.';
            return;
        }

        const name = document.getElementById('nome').value.trim();
        const phone = document.getElementById('telefone').value.trim();
        const notes = document.getElementById('obs').value.trim();
        const submitButton = bookingForm.querySelector('[type="submit"]');
        submitButton.disabled = true;
        formMsg.textContent = 'Confirmando disponibilidade...';

        try {
            const appointment = await appointmentRequest('', {
                method: 'POST',
                body: JSON.stringify({ name, phone, notes, service_id: selectedService.id, date: dateKey(selectedDate), start_time: selectedTime }),
            });
            const date = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const deposit = appointment.deposit === null ? '' : `\nValor do sinal: ${formatCurrency(appointment.deposit)}.`;
            const message = `Olá ${name}, tudo bem?\n\nSeu agendamento para ${appointment.service_name} foi registrado para ${date}, às ${appointment.start_time}.\nValor do serviço: ${formatCurrency(appointment.price)}.${deposit}\n\nVamos confirmar os próximos passos por aqui.`;

            formMsg.textContent = 'Agendamento realizado com sucesso.';
            document.getElementById('nome').value = '';
            document.getElementById('telefone').value = '';
            document.getElementById('obs').value = '';
            selectedTime = null;
            renderSlots();
            updateSummary();
        } catch (error) {
            formMsg.textContent = error.message;
        } finally {
            submitButton.disabled = false;
        }
    });

    initializeBookingServiceDropdown();
    renderCalendar();
    loadActiveServices();
    loadPublicBusinessHours();
}

function currentSession() {
    return JSON.parse(localStorage.getItem('smf-account') || 'null');
}

function storeSession(session) {
    localStorage.setItem('smf-account', JSON.stringify(session));
    if (typeof updateSharedAccountLink === 'function') updateSharedAccountLink();
}

async function finishBooking() {
    const submitButton = bookingForm.querySelector('[type="submit"]');
    const notes = document.getElementById('obs').value.trim();
    submitButton.disabled = true;
    formMsg.textContent = 'Confirmando disponibilidade...';
    try {
        const appointment = await accountRequest('/bookings', {
            method: 'POST',
            body: JSON.stringify({ notes, service_id: selectedService.id, date: dateKey(selectedDate), start_time: selectedTime }),
        });
        const session = currentSession();
        const bookingDate = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const deposit = appointment.deposit === null ? '' : `\nValor do sinal: ${formatCurrency(appointment.deposit)}.`;
        const message = `Olá ${session.client.name}, tudo bem?\n\nSeu agendamento para ${appointment.service_name} foi registrado para ${bookingDate}, às ${appointment.start_time}.\nValor do serviço: ${formatCurrency(appointment.price)}.${deposit}\n\nVamos confirmar os próximos passos por aqui.`;
        formMsg.textContent = 'Agendamento realizado com sucesso!';
        document.getElementById('obs').value = '';
        selectedTime = null;
        renderSlots();
        updateSummary();
    } catch (error) {
        if (error.status === 401) {
            formMsg.textContent = 'Entre ou cadastre-se para finalizar o agendamento.';
            openAuthenticationDialog('booking');
        } else {
            formMsg.textContent = error.message;
        }
    } finally {
        submitButton.disabled = false;
    }
}

function bookingSnapshot() {
    return {
        name: document.getElementById('nome')?.value.trim() || '',
        phone: document.getElementById('telefone')?.value.trim() || '',
        notes: document.getElementById('obs')?.value.trim() || '',
    };
}

function updateAuthModalContent(source, view = 'login') {
    const isBooking = source === 'booking';
    const title = document.getElementById('bookingAuthTitle');
    const description = document.querySelector('.booking-auth-description');
    const tabs = document.querySelector('.booking-auth-tabs');
    const isAccessView = view === 'login' || view === 'register';

    tabs.hidden = !isAccessView;
    if (view === 'reset-request') {
        title.textContent = 'Recupere sua senha';
        description.textContent = 'Informe seu e-mail para receber um link seguro de recuperação.';
        return;
    }
    if (view === 'reset-confirm') {
        title.textContent = 'Crie uma nova senha';
        description.textContent = 'Escolha uma senha nova para acessar sua conta.';
        return;
    }

    title.textContent = isBooking ? 'Entre para finalizar' : 'Acesse sua conta';
    description.textContent = isBooking
        ? 'Acesse sua conta para salvar seu agendamento.'
        : 'Entre ou crie sua conta para acessar sua área.';
    document.getElementById('bookingLoginSubmit').textContent = isBooking ? 'Entrar e confirmar' : 'Entrar';
    document.getElementById('bookingRegisterSubmit').textContent = isBooking ? 'Criar conta e confirmar' : 'Criar conta';
}

function authFieldKey(input) {
    if (input.id.includes('Identifier')) return 'identifier';
    if (input.id.includes('Phone')) return 'phone';
    if (input.id.includes('Email')) return 'email';
    if (input.id.includes('Name')) return 'name';
    if (input.id.includes('PasswordConfirm')) return 'passwordConfirm';
    if (input.id.includes('Password')) return 'password';
    return input.id;
}

function authFieldMessage(input) {
    const value = input.value.trim();
    const key = authFieldKey(input);
    if (key === 'name') return value.length >= 2 ? '' : 'Informe seu nome completo.';
    if (key === 'phone') return value.replace(/\D/g, '').length >= 10 ? '' : 'Informe um telefone válido com DDD.';
    if (key === 'email') return /^\S+@\S+\.\S+$/.test(value) ? '' : 'Informe um e-mail válido.';
    if (key === 'identifier') {
        const digits = value.replace(/\D/g, '');
        return /^\S+@\S+\.\S+$/.test(value) || digits.length >= 10 ? '' : 'Informe um telefone com DDD ou e-mail válido.';
    }
    if (key === 'password') return value.length >= 6 ? '' : 'A senha deve ter ao menos 6 caracteres.';
    if (key === 'passwordConfirm') {
        const original = input.id.startsWith('bookingReset') ? document.getElementById('bookingResetPassword') : document.getElementById('bookingRegisterPassword');
        return value && value === original.value ? '' : 'As senhas não coincidem.';
    }
    return '';
}

function setAuthFieldState(input, state = '', text = '') {
    const field = input.closest('.booking-auth-field');
    const feedback = document.querySelector(`[data-auth-feedback-for="${input.id}"]`);
    input.classList.toggle('is-valid', state === 'valid');
    input.classList.toggle('is-invalid', state === 'error');
    input.setAttribute('aria-invalid', state === 'error' ? 'true' : 'false');
    field?.classList.toggle('has-error', state === 'error');
    if (feedback) feedback.textContent = state === 'error' ? text : '';
}

function clearAuthValidation(scope = document) {
    scope.querySelectorAll?.('.booking-auth-form input').forEach((input) => setAuthFieldState(input));
}

function validateAuthInput(input, showError = true) {
    const message = authFieldMessage(input);
    if (message) {
        if (showError) setAuthFieldState(input, 'error', message);
        return false;
    }
    if (input.id === 'bookingLoginPassword') {
        setAuthFieldState(input); // correção só é confirmada pelo servidor — não pinta de verde aqui
    } else {
        setAuthFieldState(input, 'valid');
    }
    return true;
}

function validateAuthForm(form) {
    return [...form.querySelectorAll('input[required]')].map((input) => validateAuthInput(input)).every(Boolean);
}

function applyAuthFieldErrors(form, fields = {}) {
    Object.entries(fields).forEach(([key, message]) => {
        let input;
        if (key === 'passwordConfirm') input = form.querySelector('[id$="PasswordConfirm"]');
        else if (key === 'identifier') input = form.querySelector('#bookingLoginIdentifier');
        else input = form.querySelector(`[id*="${key[0].toUpperCase()}${key.slice(1)}"]`);
        if (input) setAuthFieldState(input, 'error', message);
    });
}

function openAuthenticationDialog(source = 'booking', resetToken = '') {
    const dialog = document.getElementById('bookingAuthDialog');
    if (!dialog) return false;

    const isBooking = source === 'booking';
    const snapshot = isBooking ? bookingSnapshot() : null;
    authModalContext = { source: isBooking ? 'booking' : 'account', booking: snapshot, resetToken };

    document.getElementById('bookingRegisterName').value = snapshot?.name || '';
    document.getElementById('bookingRegisterPhone').value = snapshot ? formatBrazilianPhone(snapshot.phone) : '';
    document.getElementById('bookingLoginIdentifier').value = snapshot?.phone || '';
    document.getElementById('bookingLoginPassword').value = '';
    document.getElementById('bookingRegisterPassword').value = '';
    document.getElementById('bookingRegisterPasswordConfirm').value = '';
    document.getElementById('bookingRegisterEmail').value = '';
    document.getElementById('bookingResetEmail').value = '';
    document.getElementById('bookingResetPassword').value = '';
    document.getElementById('bookingResetPasswordConfirm').value = '';
    clearAuthValidation();
    document.querySelectorAll('.booking-auth-form input').forEach((input) => {
        if (input.value) validateAuthInput(input, false);
    });
    setBookingAuthView(resetToken ? 'reset-confirm' : 'login');
    if (!dialog.open) dialog.showModal();
    return true;
}

window.openBookingAuthDialogForAccount = () => openAuthenticationDialog('account');

function setBookingAuthView(view, preserveFeedback = false) {
    const forms = {
        login: document.getElementById('bookingLoginForm'),
        register: document.getElementById('bookingRegisterForm'),
        'reset-request': document.getElementById('bookingPasswordResetRequestForm'),
        'reset-confirm': document.getElementById('bookingPasswordResetConfirmForm'),
    };
    Object.entries(forms).forEach(([name, form]) => { form.hidden = name !== view; });
    document.querySelectorAll('[data-booking-auth-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.bookingAuthView === view));
    updateAuthModalContent(authModalContext.source, view);
    if (!preserveFeedback) setAuthFeedback();
}

function setAuthFeedback(text = '', state = '') {
    const message = document.getElementById('bookingAuthMsg');
    message.textContent = text;
    message.classList.toggle('is-pending', state === 'pending');
    message.classList.toggle('is-error', state === 'error');
    message.classList.toggle('is-success', state === 'success');
}

async function finishAuthentication(response) {
    storeSession(response);
    document.getElementById('bookingAuthDialog').close();

    if (authModalContext.source === 'account') {
        window.location.href = '/minha-conta.html';
        return;
    }

    document.getElementById('nome').value = response.client.name;
    document.getElementById('telefone').value = response.client.phone;
    if (authModalContext.booking?.notes) document.getElementById('obs').value = authModalContext.booking.notes;
    await finishBooking();
}

if (bookingForm) {
    bookingForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!selectedService || !selectedDate || !selectedTime) {
            formMsg.textContent = 'Selecione um serviço, uma data e um horário antes de continuar.';
        } else if (currentSession()) {
            finishBooking();
        } else {
            openAuthenticationDialog('booking');
        }
    });
}

if (document.getElementById('bookingAuthDialog')) {
    document.querySelectorAll('[data-booking-auth-view]').forEach((button) => button.addEventListener('click', () => setBookingAuthView(button.dataset.bookingAuthView)));
    document.getElementById('bookingAuthClose').addEventListener('click', () => document.getElementById('bookingAuthDialog').close());
    document.querySelector('[data-booking-auth-forgot]').addEventListener('click', () => {
        const identifier = document.getElementById('bookingLoginIdentifier').value.trim();
        if (/^\S+@\S+\.\S+$/.test(identifier)) document.getElementById('bookingResetEmail').value = identifier;
        setBookingAuthView('reset-request');
    });
    document.querySelectorAll('[data-booking-auth-back]').forEach((button) => button.addEventListener('click', () => setBookingAuthView('login')));
    document.querySelectorAll('.booking-auth-form input').forEach((input) => {
        input.addEventListener('input', () => {
            if (input.value) validateAuthInput(input, false);
            else setAuthFieldState(input);
            if (input.id.endsWith('Password')) {
                const confirmation = input.id.startsWith('bookingReset') ? document.getElementById('bookingResetPasswordConfirm') : document.getElementById('bookingRegisterPasswordConfirm');
                if (confirmation.value) validateAuthInput(confirmation, false);
            }
        });
        input.addEventListener('blur', () => validateAuthInput(input));
    });
    document.getElementById('bookingLoginForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!validateAuthForm(form)) {
            setAuthFeedback('Revise os campos destacados.', 'error');
            return;
        }
        const submitButton = form.querySelector('[type="submit"]');
        submitButton.disabled = true;
        setAuthFeedback('Entrando...', 'pending');
        try {
            await finishAuthentication(await accountRequest('/login', { method: 'POST', body: JSON.stringify({ identifier: document.getElementById('bookingLoginIdentifier').value, password: document.getElementById('bookingLoginPassword').value }) }));
        } catch (error) {
            const hasFieldErrors = error.fields && Object.keys(error.fields).length > 0;
            if (hasFieldErrors) {
                applyAuthFieldErrors(form, error.fields);
            } else {
                setAuthFieldState(document.getElementById('bookingLoginPassword'), 'error', error.message);
            }
            setAuthFeedback(error.message, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
    document.getElementById('bookingRegisterForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const submitButton = event.currentTarget.querySelector('[type="submit"]');
        const password = document.getElementById('bookingRegisterPassword').value;
        if (!validateAuthForm(event.currentTarget)) {
            setAuthFeedback('Revise os campos destacados.', 'error');
            return;
        }
        submitButton.disabled = true;
        setAuthFeedback('Criando conta...', 'pending');
        try {
            await finishAuthentication(await accountRequest('/register', { method: 'POST', body: JSON.stringify({ name: document.getElementById('bookingRegisterName').value.trim(), phone: document.getElementById('bookingRegisterPhone').value.trim(), email: document.getElementById('bookingRegisterEmail').value.trim(), password }) }));
        } catch (error) {
            applyAuthFieldErrors(event.currentTarget, error.fields);
            setAuthFeedback(error.message, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    document.getElementById('bookingPasswordResetRequestForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateAuthForm(event.currentTarget)) {
            setAuthFeedback('Revise o e-mail informado.', 'error');
            return;
        }
        const submitButton = event.currentTarget.querySelector('[type="submit"]');
        submitButton.disabled = true;
        setAuthFeedback('Enviando link de recuperação...', 'pending');
        try {
            const response = await accountRequest('/password-reset/request', {
                method: 'POST',
                body: JSON.stringify({ email: document.getElementById('bookingResetEmail').value.trim() }),
            });
            setAuthFeedback(response.message, 'success');
        } catch (error) {
            applyAuthFieldErrors(event.currentTarget, error.fields);
            setAuthFeedback(error.message, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    document.getElementById('bookingPasswordResetConfirmForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateAuthForm(event.currentTarget)) {
            setAuthFeedback('Revise os campos destacados.', 'error');
            return;
        }
        const submitButton = event.currentTarget.querySelector('[type="submit"]');
        submitButton.disabled = true;
        setAuthFeedback('Salvando nova senha...', 'pending');
        try {
            await accountRequest('/password-reset/confirm', {
                method: 'POST',
                body: JSON.stringify({ token: authModalContext.resetToken, password: document.getElementById('bookingResetPassword').value }),
            });
            authModalContext.resetToken = '';
            window.history.replaceState({}, '', '/index.html');
            document.getElementById('bookingLoginPassword').value = '';
            setBookingAuthView('login', true);
            setAuthFeedback('Senha atualizada. Entre com sua nova senha.', 'success');
        } catch (error) {
            applyAuthFieldErrors(event.currentTarget, error.fields);
            setAuthFeedback(error.message, 'error');
        } finally {
            submitButton.disabled = false;
        }
    });

    document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
        toggle.addEventListener('click', () => {
            const input = toggle.closest('.booking-auth-password')?.querySelector('input');
            if (!input) return;
            const willShow = input.type === 'password';
            input.type = willShow ? 'text' : 'password';
            toggle.classList.toggle('is-visible', willShow);
            toggle.setAttribute('aria-pressed', String(willShow));
            toggle.setAttribute('aria-label', willShow ? 'Ocultar senha' : 'Mostrar senha');
        });
    });

    const authQuery = new URLSearchParams(window.location.search);
    const resetToken = authQuery.get('reset');
    if (resetToken) {
        openAuthenticationDialog('account', resetToken);
    } else if (authQuery.get('auth') === 'account') {
        window.history.replaceState({}, '', '/index.html');
        openAuthenticationDialog('account');
    }
}
