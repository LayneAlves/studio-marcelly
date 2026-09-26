(() => {
    const { apiBaseUrl, requestJson, escapeHtml, dateLabel, formatCurrency, appointmentStatusControl, showAppointmentDetails, updateAppointmentStatus, closeActionDropdowns } = window.Admin;
    const elements = {
        today: document.getElementById('dashboardAppointmentsToday'), billing: document.getElementById('dashboardBillingMonth'),
        clients: document.getElementById('dashboardClientsCount'), services: document.getElementById('dashboardActiveServices'),
        forecasted: document.getElementById('dashboardForecasted'), received: document.getElementById('dashboardReceived'),
        pending: document.getElementById('dashboardPending'), list: document.getElementById('dashboardUpcomingList'),
        empty: document.getElementById('dashboardUpcomingEmpty'), feedback: document.getElementById('dashboardFeedback'),
    };
    const number = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;

    function render(data = {}) {
        const summary = data.summary || {};
        const financial = data.financial_summary || {};
        const upcoming = Array.isArray(data.upcoming) ? data.upcoming : [];
        elements.today.textContent = number(summary.appointments_today);
        elements.billing.textContent = formatCurrency(number(summary.billing_month));
        elements.clients.textContent = number(summary.clients);
        elements.services.textContent = number(summary.active_services);
        elements.forecasted.textContent = formatCurrency(number(financial.forecasted));
        elements.received.textContent = formatCurrency(number(financial.received));
        elements.pending.textContent = formatCurrency(number(financial.pending));
        elements.list.replaceChildren();
        elements.empty.hidden = upcoming.length > 0;
        elements.empty.textContent = 'Nenhum próximo agendamento.';
        upcoming.forEach((appointment) => {
            const item = document.createElement('article');
            const initial = String(appointment.client_name || '?').trim().charAt(0).toUpperCase() || '?';
            item.className = 'dashboard-upcoming-item';
            item.innerHTML = `<span class="dashboard-upcoming-avatar" aria-hidden="true">${escapeHtml(initial)}</span><div class="dashboard-upcoming-client"><strong>${escapeHtml(appointment.client_name || 'Cliente não informado')}</strong><span>${escapeHtml(appointment.service_name || 'Serviço não informado')}</span></div><span class="dashboard-upcoming-date">${escapeHtml(dateLabel(appointment.date))}</span><span class="dashboard-upcoming-time">${escapeHtml(appointment.start_time || '--:--')}</span>${appointmentStatusControl(appointment, { menuKey: 'dashboard-status' })}<button class="dashboard-details-button" type="button" data-dashboard-appointment-details="${appointment.id}">Ver detalhes</button>`;
            elements.list.append(item);
        });
    }

    async function load() {
        elements.feedback.textContent = '';
        elements.feedback.classList.remove('is-error');
        try { render(await requestJson(`${apiBaseUrl}/admin/dashboard`)); }
        catch (error) {
            render(); elements.empty.hidden = false; elements.empty.textContent = 'Não foi possível carregar os próximos agendamentos.';
            elements.feedback.textContent = error.message; elements.feedback.classList.add('is-error');
        }
    }

    elements.list.addEventListener('click', async (event) => {
        const action = event.target.closest('[data-appointment-action]');
        if (action) {
            closeActionDropdowns();
            if (['cancelled', 'no_show', 'completed'].includes(action.dataset.appointmentAction)) await updateAppointmentStatus(action.dataset.appointmentId, action.dataset.appointmentAction);
            return;
        }
        const details = event.target.closest('[data-dashboard-appointment-details]');
        if (details) showAppointmentDetails(details.dataset.dashboardAppointmentDetails);
    });
    window.addEventListener('admin:appointments-updated', load);
    load();
})();
