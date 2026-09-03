const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
});


const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
});

navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navMenu.classList.remove('open'));
});

/*MODO CLARO / ESCURO */
const themeToggle = document.getElementById('themeToggle');
const htmlEl = document.documentElement;

function applyTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('smf-theme', theme);
}

themeToggle.addEventListener('click', () => {
    const current = htmlEl.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
});

const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

revealEls.forEach(el => revealObserver.observe(el));

/*GALERIA */
const galleryItems = [
    { cat: 'mega-brasileiro', label: 'Mega Brasileiro', img: 'cilios-imagens/mega-brasileiro.png' },
    { cat: 'volume-4D', label: 'Volume 4D', img: 'cilios-imagens/volume-4D.png' },
    { cat: 'volume-6D', label: 'Volume 6D', img: 'cilios-imagens/volume-6D.png' },
    { cat: 'volume-brasileiro', label: 'Volume Brasileiro', img: 'cilios-imagens/volume-brasileiro.png' },
    { cat: 'volume-fox', label: 'Volume Fox', img: 'cilios-imagens/volume-fox.png' },
    { cat: 'volume-hibrido', label: 'Volume Hibrido', img: 'cilios-imagens/volume-hibrido.png' },
    { cat: 'volume-princesa', label: 'Volume Princesa', img: 'cilios-imagens/volume-princesa.png' },
    { cat: 'volume-russo', label: 'Volume Russo', img: 'cilios-imagens/volume-russo.png' },
];

const galleryGrid = document.getElementById('galleryGrid');

function renderGallery(filter) {
    galleryGrid.innerHTML = '';
    const items = filter === 'todas' ? galleryItems : galleryItems.filter(i => i.cat === filter);
    items.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.style.animationDelay = `${i * 0.05}s`;
        card.innerHTML = `
            <div class="gallery-thumb">
                <img src="${item.img}" alt="${item.label}">
            </div>
            <div class="gallery-info">
                <h4>${item.label}</h4>
            </div>`;
        galleryGrid.appendChild(card);
        requestAnimationFrame(() => card.classList.add('show'));
    });
}

renderGallery('todas');

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderGallery(btn.dataset.filter);
    });
});

/*CALENDÁRIO E AGENDAMENTO */
const BLOCKED_DATES = {
};

const HORARIOS_PADRAO = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function seedExampleBookings() {
    const today = new Date();
    for (let i = 1; i <= 20; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        if (d.getDay() === 1) continue; // estúdio fechado às segundas
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (i % 4 === 0) {
            BLOCKED_DATES[key] = [...HORARIOS_PADRAO]; // dia totalmente cheio
        } else if (i % 3 === 0) {
            BLOCKED_DATES[key] = ['09:00', '10:00', '14:00']; // parcialmente ocupado
        }
    }
}
seedExampleBookings();

let calDate = new Date();
let selectedDate = null;
let selectedTime = null;

const calDaysEl = document.getElementById('calDays');
const calMonthLabel = document.getElementById('calMonthLabel');
const slotsGrid = document.getElementById('slotsGrid');
const slotsLabel = document.getElementById('slotsLabel');
const bookingSummary = document.getElementById('bookingSummary');

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function isPast(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
}

function renderCalendar() {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    calMonthLabel.textContent = `${MESES[month]} de ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calDaysEl.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        calDaysEl.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d);
        const key = `${year}-${month}-${d}`;
        const dayEl = document.createElement('div');
        dayEl.className = 'cal-day';
        dayEl.textContent = d;

        const fullyBooked = BLOCKED_DATES[key] && BLOCKED_DATES[key].length >= HORARIOS_PADRAO.length;
        const isMonday = date.getDay() === 1;

        if (isPast(date)) {
            dayEl.classList.add('past');
        } else if (fullyBooked || isMonday) {
            dayEl.classList.add('blocked');
        } else {
            dayEl.addEventListener('click', () => selectDate(date, dayEl));
        }

        if (selectedDate && selectedDate.getTime() === date.getTime()) {
            dayEl.classList.add('selected');
        }

        calDaysEl.appendChild(dayEl);
    }
}

function selectDate(date, el) {
    document.querySelectorAll('.cal-day.selected').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    selectedDate = date;
    selectedTime = null;
    renderSlots();
    updateSummary();
}

function renderSlots() {
    slotsGrid.innerHTML = '';
    if (!selectedDate) {
        slotsLabel.textContent = 'Selecione uma data para ver os horários';
        return;
    }
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    const taken = BLOCKED_DATES[key] || [];
    slotsLabel.textContent = 'Horários disponíveis';

    HORARIOS_PADRAO.forEach(hora => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slot-btn';
        btn.textContent = hora;
        if (taken.includes(hora)) {
            btn.classList.add('taken');
            btn.disabled = true;
        } else {
            if (selectedTime === hora) {
                btn.classList.add('selected');
            }
            btn.addEventListener('click', () => {
                document.querySelectorAll('.slot-btn.selected').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedTime = hora;
                updateSummary();
            });
        }
        slotsGrid.appendChild(btn);
    });
}

function updateSummary() {
    if (selectedDate && selectedTime) {
        const dataFmt = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        bookingSummary.textContent = `Selecionado: ${dataFmt} às ${selectedTime}`;
    } else if (selectedDate) {
        const dataFmt = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        bookingSummary.textContent = `Data: ${dataFmt} — escolha um horário`;
    } else {
        bookingSummary.textContent = 'Nenhuma data selecionada ainda.';
    }
}

document.getElementById('prevMonth').addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    calDate.setMonth(calDate.getMonth() + 1);
    renderCalendar();
});

renderCalendar();


/*ENVIO PARA O WHATSAPP */
const bookingForm = document.getElementById('bookingForm');
const formMsg = document.getElementById('formMsg');
// const NUMERO_WHATSAPP = '5511940469798';
const NUMERO_WHATSAPP = '5511980942679';

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!selectedDate || !selectedTime) {
        formMsg.textContent = 'Selecione uma data e um horário no calendário antes de continuar.';
        return;
    }

    const nome = document.getElementById('nome').value.trim();

    const dataFmt = selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dataHora = `${dataFmt} às ${selectedTime}`;

    const mensagem =
`Olá ${nome}, tudo bem?

Seu horário ${dataHora}.

Será confirmado mediante o pagamento do sinal de 30$, descontado do valor final.

Chave do PIX: (11) 94046-9798
Telefone (Banco Nubank)

• Contrato de agendamento.

Caso de desistência da cliente com máximo de 72 horas (3 dias), o valor do sinal é reembolsado 50%.

• Regulamento do estabelecimento:

Não trazer acompanhante.

Caso desista no dia do atendimento, o valor não será reembolsado.

Tolerância de atraso: 10 minutos.

Com mais de 10 minutos de atraso, não haverá atendimento e o valor não será reembolsado.`;

    const link = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;

    formMsg.textContent = 'Abrindo o WhatsApp para confirmar seu agendamento...';
    window.open(link, '_blank');
});