(() => {
    const apiBaseUrl = `http://${window.location.hostname || '127.0.0.1'}:3000/api`;
    const appointmentDialog = document.getElementById('appointmentDialog');
    const appointmentDialogContent = document.getElementById('appointmentDialogContent');
    const adminSidebar = document.getElementById('adminSidebar');
    const adminMenuToggle = document.getElementById('adminMenuToggle');
    const adminSidebarBackdrop = document.getElementById('adminSidebarBackdrop');
    const statusLabels = {
        pending: 'Pendente', confirmed: 'Confirmado', in_progress: 'Em atendimento',
        completed: 'Concluído', cancelled: 'Cancelado', no_show: 'Não compareceu',
    };
    const appointmentStatusIcons = {
        pending: 'fa-regular fa-clock', confirmed: 'fa-regular fa-circle-check',
        in_progress: 'fa-solid fa-spinner', completed: 'fa-solid fa-check',
        cancelled: 'fa-solid fa-xmark', no_show: 'fa-solid fa-triangle-exclamation',
    };
    const actionMenuIcons = {
        details: 'fa-regular fa-file-lines', mark_paid: 'fa-solid fa-check',
        edit_payment: 'fa-regular fa-pen-to-square', reschedule: 'fa-regular fa-calendar-days',
        cancelled: 'fa-solid fa-xmark', no_show: 'fa-solid fa-triangle-exclamation', completed: 'fa-solid fa-check',
    };

    function escapeHtml(value = '') {
        const element = document.createElement('div');
        element.textContent = value ?? '';
        return element.innerHTML;
    }

    function dateLabel(value) {
        if (!value) return 'Data não informada';
        return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
    }

    function parseCurrency(value) {
        const normalized = String(value || '').replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
        const amount = Number(normalized);
        return Number.isFinite(amount) && amount >= 0 ? amount : null;
    }

    function formatCurrencyTyping(input) {
        const cents = Number(input.value.replace(/\D/g, ''));
        input.value = cents ? formatCurrency(cents / 100) : '';
    }

    async function requestJson(url, options = {}) {
        const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.');
        return data;
    }

    function closeActionDropdowns(except = null) {
        document.querySelectorAll('[data-action-dropdown].is-open').forEach((dropdown) => {
            if (dropdown === except) return;
            dropdown.classList.remove('is-open');
            dropdown.querySelector('[data-action-dropdown-toggle]')?.setAttribute('aria-expanded', 'false');
        });
    }

    function actionDropdown({ id, context, label, items, triggerContent = '<span>Ações</span>', triggerClass = '', menuKey = '' }) {
        const menuId = `${context}-actions-${id}${menuKey ? `-${menuKey}` : ''}`;
        const menuItems = items.map((item) => `<button class="action-dropdown-item action-dropdown-item--${item.tone || 'neutral'}" type="button" role="menuitem" data-${context}-action="${item.action}" data-${context}-id="${id}"><i class="${actionMenuIcons[item.action] || 'fa-regular fa-circle'}" aria-hidden="true"></i><span>${item.label}</span></button>`).join('');
        return `<div class="action-dropdown" data-action-dropdown><button class="action-dropdown-toggle ${triggerClass}" type="button" data-action-dropdown-toggle aria-label="${escapeHtml(label)}" aria-haspopup="menu" aria-expanded="false" aria-controls="${menuId}">${triggerContent}<i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button><div class="action-dropdown-menu" id="${menuId}" role="menu">${menuItems}</div></div>`;
    }

    function appointmentStatusControl(appointment, { includeDetails = false, includeReschedule = false, menuKey = 'status' } = {}) {
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

    function openDialog(content, variant = '') {
        if (!appointmentDialog || !appointmentDialogContent) return;
        appointmentDialog.classList.toggle('is-appointment-details-dialog', variant === 'appointment-details');
        appointmentDialogContent.innerHTML = content;
        if (!appointmentDialog.open) appointmentDialog.showModal();
    }

    function closeDialog() {
        if (!appointmentDialog) return;
        if (appointmentDialog.open) appointmentDialog.close();
        appointmentDialog.classList.remove('is-appointment-details-dialog');
    }

    async function updateAppointmentStatus(id, status) {
        if (status === 'cancelled' && !window.confirm('Cancelar este agendamento? O registro será mantido no histórico.')) return false;
        await requestJson(`${apiBaseUrl}/appointments?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) });
        window.dispatchEvent(new CustomEvent('admin:appointments-updated', { detail: { id: String(id), status } }));
        closeDialog();
        return true;
    }

    async function showAppointmentDetails(id) {
        try {
            const appointment = await requestJson(`${apiBaseUrl}/appointments?id=${encodeURIComponent(id)}`);
            const remaining = Math.max(Number(appointment.price || 0) - Number(appointment.deposit || 0), 0);
            const createdAt = appointment.created_at ? new Date(appointment.created_at.replace(' ', 'T')).toLocaleString('pt-BR') : 'Não informado';
            openDialog(`<article class="booking-detail-modal"><header class="booking-detail-header"><div><p class="booking-detail-eyebrow">Studio Marcelly Freitas</p><h2>Detalhes do agendamento</h2><p class="booking-detail-service">${escapeHtml(appointment.service_name)}</p></div></header><section class="booking-detail-card booking-detail-client-card"><div class="booking-detail-client"><span class="booking-detail-avatar"><i class="fa-regular fa-user" aria-hidden="true"></i></span><div><p class="booking-detail-label">Cliente</p><strong>${escapeHtml(appointment.client_name)}</strong></div></div><div class="booking-detail-card-divider" aria-hidden="true"></div><div class="booking-detail-contact"><p><i class="fa-solid fa-phone" aria-hidden="true"></i><span>${escapeHtml(appointment.phone || 'Não informado')}</span></p><p><i class="fa-regular fa-envelope" aria-hidden="true"></i><span>${escapeHtml(appointment.email || 'E-mail não informado')}</span></p></div></section><section class="booking-detail-card booking-detail-info-card"><p class="booking-detail-section-title">Informações do agendamento</p><div class="booking-detail-info-list"><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-calendar" aria-hidden="true"></i></span><div><p class="booking-detail-label">Data</p><strong>${dateLabel(appointment.date)}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-clock" aria-hidden="true"></i></span><div><p class="booking-detail-label">Horário</p><strong>${appointment.start_time} — ${appointment.end_time}</strong></div></div><div class="booking-detail-info-row"><span class="booking-detail-icon"><i class="fa-regular fa-hourglass-half" aria-hidden="true"></i></span><div><p class="booking-detail-label">Duração</p><strong>${appointment.duration_minutes} minutos</strong></div></div></div></section><section class="booking-detail-card booking-detail-values-card"><div class="booking-detail-value"><span class="booking-detail-icon"><i class="fa-regular fa-credit-card" aria-hidden="true"></i></span><div><p class="booking-detail-label">Valor</p><strong>${formatCurrency(appointment.price)}</strong></div></div><div class="booking-detail-value"><span class="booking-detail-icon"><i class="fa-solid fa-money-bill-wave" aria-hidden="true"></i></span><div><p class="booking-detail-label">Sinal</p><strong>${appointment.deposit == null ? 'Não informado' : formatCurrency(appointment.deposit)}</strong></div></div><div class="booking-detail-value"><span class="booking-detail-icon"><i class="fa-solid fa-chart-line" aria-hidden="true"></i></span><div><p class="booking-detail-label">Valor restante</p><strong>${formatCurrency(remaining)}</strong></div></div></section><footer class="booking-detail-footer"><section class="booking-detail-card booking-detail-meta-card"><p class="booking-detail-label">Status</p><div class="booking-detail-status-control">${appointmentStatusControl(appointment, { menuKey: 'details-status' })}</div></section><section class="booking-detail-card booking-detail-meta-card"><p class="booking-detail-label">Criado em</p><p class="booking-detail-created"><i class="fa-regular fa-clock" aria-hidden="true"></i><strong>${createdAt}</strong></p></section></footer></article>`, 'appointment-details');
        } catch (error) {
            window.alert(error.message);
        }
    }

    function setAdminMenuState(isOpen) {
        if (!adminSidebar || !adminMenuToggle || !adminSidebarBackdrop) return;
        adminSidebar.classList.toggle('is-open', isOpen);
        adminMenuToggle.classList.toggle('is-open', isOpen);
        adminSidebarBackdrop.classList.toggle('is-visible', isOpen);
        adminMenuToggle.setAttribute('aria-expanded', String(isOpen));
    }

    adminMenuToggle?.addEventListener('click', () => setAdminMenuState(!adminSidebar.classList.contains('is-open')));
    adminSidebarBackdrop?.addEventListener('click', () => setAdminMenuState(false));
    document.querySelectorAll('.admin-menu-link').forEach((link) => link.addEventListener('click', () => setAdminMenuState(false)));
    document.getElementById('appointmentDialogClose')?.addEventListener('click', closeDialog);

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

    appointmentDialogContent?.addEventListener('click', (event) => {
        const action = event.target.closest('[data-appointment-action]');
        if (!action) return;
        const status = action.dataset.appointmentAction;
        if (['cancelled', 'no_show', 'completed'].includes(status)) updateAppointmentStatus(action.dataset.appointmentId, status).catch((error) => window.alert(error.message));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        setAdminMenuState(false);
        closeActionDropdowns();
    });

    window.Admin = {
        apiBaseUrl, statusLabels, escapeHtml, dateLabel, formatCurrency, parseCurrency, formatCurrencyTyping,
        requestJson, actionDropdown, appointmentStatusControl, closeActionDropdowns,
        openDialog, closeDialog, showAppointmentDetails, updateAppointmentStatus,
    };
})();
