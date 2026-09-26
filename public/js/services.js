(() => {
    const { apiBaseUrl, requestJson, formatCurrency, parseCurrency, formatCurrencyTyping } = window.Admin;
    const apiUrl = `${apiBaseUrl}/admin/services`;
    const form = document.getElementById('serviceForm');
    const fields = {
        id: document.getElementById('serviceId'), name: document.getElementById('serviceName'), value: document.getElementById('serviceValue'),
        duration: document.getElementById('serviceDuration'), deposit: document.getElementById('serviceDeposit'), maintenanceDays: document.getElementById('serviceMaintenanceDays'),
        title: document.getElementById('serviceFormTitle'), submit: document.getElementById('serviceSubmitButton'), cancel: document.getElementById('serviceCancelEdit'),
        list: document.getElementById('serviceList'), count: document.getElementById('serviceCount'), empty: document.getElementById('serviceEmptyState'), feedback: document.getElementById('serviceFeedback'),
    };
    let services = [];
    const request = (path = '', options = {}) => requestJson(`${apiUrl}${path}`, options);
    const feedback = (message = '', isError = false) => { fields.feedback.textContent = message; fields.feedback.classList.toggle('is-error', isError); };
    const cell = (label, content) => { const td = document.createElement('td'); td.dataset.label = label; typeof content === 'string' ? td.textContent = content : td.append(content); return td; };

    function reset() {
        form.reset(); fields.id.value = ''; fields.title.textContent = 'Cadastrar serviço'; fields.submit.textContent = 'Cadastrar serviço'; fields.cancel.hidden = true;
    }
    function render() {
        fields.list.replaceChildren();
        fields.count.textContent = `${services.length} ${services.length === 1 ? 'serviço' : 'serviços'}`;
        fields.empty.hidden = services.length > 0;
        services.forEach((service) => {
            const row = document.createElement('tr'); row.classList.toggle('is-inactive', !service.active);
            row.append(cell('Nome do serviço', service.name), cell('Valor', formatCurrency(service.value)), cell('Duração', service.duration), cell('Valor do sinal', service.deposit == null ? 'Não informado' : formatCurrency(service.deposit)), cell('Manutenção', service.maintenance_days ? `${service.maintenance_days} dias` : 'Não definida'));
            const status = document.createElement('div'); status.className = 'service-status';
            const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = service.active; toggle.setAttribute('aria-label', `${service.active ? 'Desativar' : 'Ativar'} ${service.name}`); toggle.addEventListener('change', () => toggleStatus(service.id));
            const label = document.createElement('label'); label.className = 'service-switch'; label.append(toggle, Object.assign(document.createElement('span'), { className: 'service-switch-track' }));
            const text = document.createElement('span'); text.textContent = service.active ? 'Ativado' : 'Desativado'; status.append(label, text); row.append(cell('Status', status));
            const actions = document.createElement('div'); actions.className = 'service-actions';
            const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'service-action-button'; edit.textContent = 'Editar'; edit.addEventListener('click', () => editService(service.id));
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'service-action-button service-action-button-delete'; remove.textContent = 'Excluir'; remove.addEventListener('click', () => removeService(service.id));
            actions.append(edit, remove); row.append(cell('Ações', actions)); fields.list.append(row);
        });
    }
    async function load() { try { services = await request(); render(); feedback(); } catch (error) { services = []; render(); feedback(error.message, true); } }
    async function toggleStatus(id) { const service = services.find((item) => item.id === id); if (!service) return; try { const updated = await request(`?id=${id}`, { method: 'PATCH', body: JSON.stringify({ active: !service.active }) }); services = services.map((item) => item.id === id ? updated : item); render(); feedback(`Serviço ${updated.active ? 'ativado' : 'desativado'} com sucesso.`); } catch (error) { render(); feedback(error.message, true); } }
    function editService(id) { const service = services.find((item) => item.id === id); if (!service) return; fields.id.value = service.id; fields.name.value = service.name; fields.value.value = formatCurrency(service.value); fields.duration.value = service.duration; fields.deposit.value = service.deposit == null ? '' : formatCurrency(service.deposit); fields.maintenanceDays.value = service.maintenance_days || ''; fields.title.textContent = 'Editar serviço'; fields.submit.textContent = 'Salvar alterações'; fields.cancel.hidden = false; fields.name.focus(); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    async function removeService(id) { const service = services.find((item) => item.id === id); if (!service || !window.confirm(`Excluir o serviço “${service.name}”? Esta ação não pode ser desfeita.`)) return; try { await request(`?id=${id}`, { method: 'DELETE' }); services = services.filter((item) => item.id !== id); if (fields.id.value === id) reset(); render(); feedback('Serviço excluído com sucesso.'); } catch (error) { feedback(error.message, true); } }
    form.addEventListener('submit', async (event) => { event.preventDefault(); const value = parseCurrency(fields.value.value); const deposit = fields.deposit.value.trim() ? parseCurrency(fields.deposit.value) : null; const maintenanceDays = fields.maintenanceDays.value.trim() ? Number(fields.maintenanceDays.value) : null; if (value === null || (fields.deposit.value.trim() && deposit === null)) return feedback('Informe valores válidos em reais.', true); if (maintenanceDays !== null && (!Number.isInteger(maintenanceDays) || maintenanceDays < 1 || maintenanceDays > 365)) return feedback('Informe uma manutenção entre 1 e 365 dias.', true); try { const editing = Boolean(fields.id.value); const saved = await request(editing ? `?id=${fields.id.value}` : '', { method: editing ? 'PUT' : 'POST', body: JSON.stringify({ name: fields.name.value.trim(), value, duration: fields.duration.value, deposit, maintenance_days: maintenanceDays }) }); services = editing ? services.map((item) => item.id === saved.id ? saved : item) : [saved, ...services]; reset(); render(); feedback(editing ? 'Alterações salvas com sucesso.' : 'Serviço cadastrado com sucesso.'); } catch (error) { feedback(error.message, true); } });
    fields.cancel.addEventListener('click', reset); [fields.value, fields.deposit].forEach((input) => input.addEventListener('input', () => formatCurrencyTyping(input))); load();
})();
