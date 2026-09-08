const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 40);
});

const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
    navMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => navMenu.classList.remove('open'));
    });
}

const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;

function applyTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('smf-theme', theme);
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const current = htmlEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
}

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
    { cat: 'mega-brasileiro', label: 'Mega Brasileiro', img: 'cilios-imagens/mega-brasileiro.png' },
    { cat: 'volume-4D', label: 'Volume 4D', img: 'cilios-imagens/volume-4D.png' },
    { cat: 'volume-6D', label: 'Volume 6D', img: 'cilios-imagens/volume-6D.png' },
    { cat: 'volume-brasileiro', label: 'Volume Brasileiro', img: 'cilios-imagens/volume-brasileiro.png' },
    { cat: 'volume-fox', label: 'Volume Fox', img: 'cilios-imagens/volume-fox.png' },
    { cat: 'volume-hibrido', label: 'Volume Híbrido', img: 'cilios-imagens/volume-hibrido.png' },
    { cat: 'volume-princesa', label: 'Volume Princesa', img: 'cilios-imagens/volume-princesa.png' },
    { cat: 'volume-russo', label: 'Volume Russo', img: 'cilios-imagens/volume-russo.png' },
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

const SERVICES_API_URL = 'api/services.php?active=1';
const APPOINTMENTS_API_URL = 'api/appointments.php';
const NUMERO_WHATSAPP = '5511980942679';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const calDaysEl = document.getElementById('calDays');
const calMonthLabel = document.getElementById('calMonthLabel');
const slotsGrid = document.getElementById('slotsGrid');
const slotsLabel = document.getElementById('slotsLabel');
const bookingSummary = document.getElementById('bookingSummary');
const bookingForm = document.getElementById('bookingForm');
const formMsg = document.getElementById('formMsg');
const serviceSelect = document.getElementById('servico');

let calDate = new Date();
let selectedDate = null;
let selectedTime = null;
let selectedService = null;
let activeServices = [];
let slotsRequestVersion = 0;

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

async function appointmentRequest(path = '', options = {}) {
    const response = await fetch(`${APPOINTMENTS_API_URL}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível consultar os horários.');
    return data;
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
        if (activeServices.length === 0) {
            serviceSelect.options[0].textContent = 'Nenhum serviço disponível';
            formMsg.textContent = 'Não há serviços ativos disponíveis para agendamento.';
        }
    } catch (error) {
        serviceSelect.replaceChildren(new Option('Não foi possível carregar os serviços', ''));
        serviceSelect.disabled = true;
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

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayElement = document.createElement('div');
        dayElement.className = 'cal-day';
        dayElement.textContent = day;

        if (isPast(date)) {
            dayElement.classList.add('past');
        } else if (date.getDay() === 1) {
            dayElement.classList.add('blocked');
            dayElement.title = 'O studio não atende às segundas-feiras';
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
        const availability = await appointmentRequest(`?date=${dateKey(selectedDate)}&service_id=${encodeURIComponent(selectedService.id)}`);
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
        selectedService = activeServices.find((service) => service.id === serviceSelect.value) || null;
        selectedTime = null;
        formMsg.textContent = '';
        renderCalendar();
        renderSlots();
        updateSummary();
    });

    bookingForm.addEventListener('submit', async (event) => {
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

            formMsg.textContent = 'Agendamento salvo. Abrindo o WhatsApp...';
            window.open(`https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank');
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

    renderCalendar();
    loadActiveServices();
}
