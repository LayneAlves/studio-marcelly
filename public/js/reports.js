(() => {
    const { apiBaseUrl, requestJson, escapeHtml, dateLabel, formatCurrency, statusLabels } = window.Admin;
    const apiUrl = `${apiBaseUrl}/reports`;
    const elements = {
        total: document.getElementById('reportsTotalAppointments'),
        completed: document.getElementById('reportsCompleted'),
        cancelled: document.getElementById('reportsCancelled'),
        noShow: document.getElementById('reportsNoShow'),
        received: document.getElementById('reportsReceived'),
        pending: document.getElementById('reportsPending'),
        statusPending: document.getElementById('reportsStatusPending'),
        statusConfirmed: document.getElementById('reportsStatusConfirmed'),
        statusCompleted: document.getElementById('reportsStatusCompleted'),
        statusCancelled: document.getElementById('reportsStatusCancelled'),
        statusNoShow: document.getElementById('reportsStatusNoShow'),
        forecasted: document.getElementById('reportsForecasted'),
        financialReceived: document.getElementById('reportsFinancialReceived'),
        financialPending: document.getElementById('reportsFinancialPending'),
        clientsAttended: document.getElementById('reportsClientsAttended'),
        clientsNew: document.getElementById('reportsClientsNew'),
        clientsRecurring: document.getElementById('reportsClientsRecurring'),
        services: document.getElementById('reportsServicesList'),
        servicesEmpty: document.getElementById('reportsServicesEmpty'),
        records: document.getElementById('reportsRecords'),
        recordsEmpty: document.getElementById('reportsRecordsEmpty'),
        customRange: document.getElementById('reportsCustomRange'),
        start: document.getElementById('reportsStartDate'),
        end: document.getElementById('reportsEndDate'),
        feedback: document.getElementById('reportsFeedback'),
        label: document.getElementById('reportsPeriodLabel'),
    };
    const periodLabels = { today: 'Hoje', week: 'Esta semana', month: 'Este mês', custom: 'Período personalizado' };
    let period = 'month';

    const safeNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
    const setText = (element, value) => { if (element) element.textContent = value; };
    const feedback = (message = '', isError = false) => {
        elements.feedback.textContent = message;
        elements.feedback.classList.toggle('is-error', isError);
    };
    const money = (value) => formatCurrency(safeNumber(value));
    const status = (value) => {
        const name = statusLabels[value] || 'Não informado';
        return `<span class="status-badge status-${escapeHtml(value || 'pending')}">${escapeHtml(name)}</span>`;
    };
    const cell = (label, content, className = '') => `<td class="${className}" data-label="${label}">${content}</td>`;

    function render(data = {}) {
        const appointments = data.appointments || {};
        const statuses = data.statuses || {};
        const financial = data.financial || {};
        const clients = data.clients || {};
        const services = Array.isArray(data.services) ? data.services : [];
        const records = Array.isArray(data.records) ? data.records : [];

        setText(elements.total, safeNumber(appointments.total));
        setText(elements.completed, safeNumber(appointments.completed));
        setText(elements.cancelled, safeNumber(appointments.cancelled));
        setText(elements.noShow, safeNumber(appointments.no_show));
        setText(elements.received, money(financial.received));
        setText(elements.pending, money(financial.pending));
        setText(elements.statusPending, safeNumber(statuses.pending));
        setText(elements.statusConfirmed, safeNumber(statuses.confirmed));
        setText(elements.statusCompleted, safeNumber(statuses.completed));
        setText(elements.statusCancelled, safeNumber(statuses.cancelled));
        setText(elements.statusNoShow, safeNumber(statuses.no_show));
        setText(elements.forecasted, money(financial.forecasted));
        setText(elements.financialReceived, money(financial.received));
        setText(elements.financialPending, money(financial.pending));
        setText(elements.clientsAttended, safeNumber(clients.attended));
        setText(elements.clientsNew, safeNumber(clients.new));
        setText(elements.clientsRecurring, safeNumber(clients.recurring));

        elements.services.replaceChildren();
        elements.servicesEmpty.hidden = services.length > 0;
        services.forEach((service, index) => {
            const item = document.createElement('li');
            item.innerHTML = `<span class="reports-rank" aria-hidden="true">${index + 1}</span><strong>${escapeHtml(service.service_name || 'Serviço não informado')}</strong><span>${safeNumber(service.total)} atendimento${safeNumber(service.total) === 1 ? '' : 's'}</span>`;
            elements.services.append(item);
        });

        elements.records.replaceChildren();
        elements.recordsEmpty.hidden = records.length > 0;
        records.forEach((record) => {
            const row = document.createElement('tr');
            row.innerHTML = [
                cell('Data', dateLabel(record.date)),
                cell('Cliente', `<strong>${escapeHtml(record.client_name || 'Cliente não informado')}</strong>`, 'reports-client'),
                cell('Serviço', escapeHtml(record.service_name || 'Serviço não informado')),
                cell('Status', status(record.status)),
                cell('Valor do serviço', money(record.price)),
                cell('Valor pago', money(record.paid)),
                cell('Valor restante', money(record.remaining), 'reports-remaining'),
            ].join('');
            elements.records.append(row);
        });

        const range = data.start && data.end ? ` · ${dateLabel(data.start)} a ${dateLabel(data.end)}` : '';
        setText(elements.label, `${periodLabels[data.period] || 'Período'}${range}`);
    }

    async function load() {
        const params = new URLSearchParams({ period });
        if (period === 'custom') {
            params.set('start', elements.start.value);
            params.set('end', elements.end.value);
        }
        try {
            render(await requestJson(`${apiUrl}?${params}`));
            feedback();
        } catch (error) {
            render();
            elements.recordsEmpty.hidden = false;
            elements.recordsEmpty.textContent = error.message || 'Não foi possível gerar o relatório.';
            feedback(error.message || 'Não foi possível gerar o relatório.', true);
        }
    }

    document.querySelectorAll('[data-report-period]').forEach((button) => {
        button.addEventListener('click', () => {
            period = button.dataset.reportPeriod;
            document.querySelectorAll('[data-report-period]').forEach((item) => item.classList.toggle('is-active', item === button));
            elements.customRange.hidden = period !== 'custom';
            if (period !== 'custom') {
                load();
                return;
            }
            const today = new Date().toISOString().slice(0, 10);
            if (!elements.start.value) elements.start.value = today;
            if (!elements.end.value) elements.end.value = today;
        });
    });

    elements.customRange.addEventListener('submit', (event) => {
        event.preventDefault();
        if (elements.start.value > elements.end.value) {
            feedback('A data inicial deve ser anterior ou igual à data final.', true);
            return;
        }
        load();
    });

    load();
})();
