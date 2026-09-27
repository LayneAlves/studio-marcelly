(() => {
    const { apiBaseUrl, escapeHtml } = window.Admin;
    const apiUrl = `${apiBaseUrl}/admin/administrators`;
    const list = document.getElementById('administratorsList');
    const empty = document.getElementById('administratorsEmpty');
    const count = document.getElementById('administratorsCount');
    const dialog = document.getElementById('administratorDialog');
    const dialogContent = document.getElementById('administratorDialogContent');
    let searchTimer;
    let selectedCandidate = null;

    const request = async (path = '', options = {}) => {
        const response = await fetch(`${apiUrl}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Não foi possível concluir esta ação.');
        return data;
    };
    const dateLabel = (value) => value ? new Date(String(value).replace(' ', 'T')).toLocaleDateString('pt-BR') : 'Não informado';
    const initial = (name) => String(name || '?').trim().charAt(0).toUpperCase() || '?';
    const plural = (total) => `${total} administradora${total === 1 ? '' : 's'}`;

    function renderAdministrators(administrators) {
        list.replaceChildren();
        empty.hidden = administrators.length > 0;
        count.textContent = plural(administrators.length);
        administrators.forEach((administrator) => {
            const card = document.createElement('article');
            card.className = 'administrator-card';
            const role = administrator.isOwner ? 'Proprietária' : 'Administradora';
            card.innerHTML = `<div class="administrator-card-profile"><span class="administrator-avatar" aria-hidden="true">${escapeHtml(initial(administrator.name))}</span><div><h3>${escapeHtml(administrator.name)}</h3><p>${escapeHtml(administrator.email || administrator.phone)}</p></div></div><div class="administrator-card-meta"><span class="administrator-role ${administrator.isOwner ? 'administrator-role--owner' : ''}">${role}</span><span class="administrator-created">Acesso desde ${dateLabel(administrator.created_at)}</span></div><div class="administrator-card-action">${administrator.isOwner ? '<span class="administrator-protected">Acesso protegido</span>' : `<button type="button" class="administrator-remove" data-remove-administrator="${administrator.id}">Remover acesso</button>`}</div>`;
            list.append(card);
        });
    }

    async function loadAdministrators() {
        try {
            renderAdministrators(await request());
        } catch (error) {
            list.replaceChildren();
            empty.hidden = false;
            empty.textContent = error.message;
            count.textContent = plural(0);
        }
    }

    function closeDialog() {
        if (dialog.open) dialog.close();
        dialogContent.replaceChildren();
        selectedCandidate = null;
    }

    function candidateCard(candidate) {
        return `<button class="administrator-candidate" type="button" data-administrator-candidate="${candidate.id}"><span class="administrator-avatar" aria-hidden="true">${escapeHtml(initial(candidate.name))}</span><span><strong>${escapeHtml(candidate.name)}</strong><small>${escapeHtml(candidate.email || candidate.phone)}</small></span></button>`;
    }

    async function searchCandidates(query = '') {
        const results = document.getElementById('administratorCandidates');
        const feedback = document.getElementById('administratorDialogFeedback');
        if (!results) return;
        results.setAttribute('aria-busy', 'true');
        try {
            const candidates = await request(`?scope=candidates&q=${encodeURIComponent(query)}`);
            results.innerHTML = candidates.length ? candidates.map(candidateCard).join('') : '<p class="administrators-search-empty">Nenhuma cliente com conta encontrada.</p>';
            feedback.textContent = '';
        } catch (error) {
            results.innerHTML = '';
            feedback.textContent = error.message;
        } finally {
            results.setAttribute('aria-busy', 'false');
        }
    }

    function openNewAdministratorDialog() {
        selectedCandidate = null;
        dialogContent.innerHTML = `<article class="administrator-dialog-content"><p class="admin-eyebrow">Novo acesso</p><h2 id="administratorDialogTitle">Adicionar administradora</h2><p>Busque uma cliente que já tenha uma conta para liberar o acesso ao painel.</p><label class="administrator-search-label" for="administratorSearch">Nome, telefone ou e-mail<input id="administratorSearch" type="search" autocomplete="off" placeholder="Digite para buscar uma cliente"></label><div class="administrator-candidates" id="administratorCandidates" aria-live="polite" aria-busy="true"></div><p class="administrator-selection" id="administratorSelection">Selecione uma cliente para continuar.</p><button class="admin-button administrator-promote" id="administratorPromote" type="button" disabled>Conceder acesso administrativo</button><p class="administrator-dialog-feedback" id="administratorDialogFeedback" role="status" aria-live="polite"></p></article>`;
        dialog.showModal();
        const search = document.getElementById('administratorSearch');
        search.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => searchCandidates(search.value.trim()), 250);
        });
        searchCandidates();
    }

    async function onDialogClick(event) {
        const candidateButton = event.target.closest('[data-administrator-candidate]');
        if (candidateButton) {
            const candidates = [...dialogContent.querySelectorAll('[data-administrator-candidate]')];
            candidates.forEach((item) => item.classList.toggle('is-selected', item === candidateButton));
            selectedCandidate = candidateButton.dataset.administratorCandidate;
            document.getElementById('administratorSelection').textContent = `Cliente selecionada: ${candidateButton.querySelector('strong').textContent}.`;
            document.getElementById('administratorPromote').disabled = false;
            return;
        }
        if (event.target.id !== 'administratorPromote' || !selectedCandidate) return;
        const button = event.target;
        const feedback = document.getElementById('administratorDialogFeedback');
        button.disabled = true;
        feedback.textContent = 'Concedendo acesso...';
        try {
            await request('', { method: 'POST', body: JSON.stringify({ client_id: selectedCandidate }) });
            closeDialog();
            await loadAdministrators();
        } catch (error) {
            feedback.textContent = error.message;
            button.disabled = false;
        }
    }

    async function removeAdministrator(id) {
        if (!window.confirm('Remover o acesso administrativo desta cliente? Ela continuará cadastrada como cliente.')) return;
        try {
            await request(`?id=${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ action: 'remove_master' }) });
            await loadAdministrators();
        } catch (error) {
            window.alert(error.message);
        }
    }

    document.getElementById('newAdministratorButton').addEventListener('click', openNewAdministratorDialog);
    document.getElementById('administratorDialogClose').addEventListener('click', closeDialog);
    dialogContent.addEventListener('click', onDialogClick);
    dialog.addEventListener('close', () => { selectedCandidate = null; });
    list.addEventListener('click', (event) => {
        const button = event.target.closest('[data-remove-administrator]');
        if (button) removeAdministrator(button.dataset.removeAdministrator);
    });
    loadAdministrators();
})();
