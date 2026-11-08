(() => {
    const selector = '#appointmentServiceFilter, #appointmentStatusFilter, #appointmentClient, #appointmentService, #appointmentTime, #newTime';
    const enhanced = new WeakSet();
    let closeCurrent = null;
    function enhance(select) {
        if (enhanced.has(select)) return;
        enhanced.add(select);
        const wrapper = document.createElement('div');
        wrapper.className = 'booking-service-dropdown standard-select-dropdown';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'booking-service-dropdown-toggle';
        toggle.id = select.id + 'Toggle';
        toggle.setAttribute('aria-haspopup', 'listbox');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', select.id + 'Menu');
        const label = document.createElement('span');
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-chevron-down';
        icon.setAttribute('aria-hidden', 'true');
        toggle.append(label, icon);
        const menu = document.createElement('div');
        menu.className = 'booking-service-dropdown-menu';
        menu.id = select.id + 'Menu';
        menu.setAttribute('role', 'listbox');
        const explicitLabel = document.querySelector('label[for="' + select.id + '"]');
        const implicitLabel = select.closest('label');
        const previous = select.previousElementSibling;
        const name = explicitLabel?.textContent || (implicitLabel ? Array.from(implicitLabel.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join('') : previous?.tagName === 'LABEL' ? previous.textContent : select.options[0]?.textContent) || 'Selecionar';
        toggle.setAttribute('aria-label', name.trim());
        menu.setAttribute('aria-label', name.trim());
        if (explicitLabel) explicitLabel.htmlFor = toggle.id;
        if (implicitLabel) {
            const standaloneLabel = document.createElement('span');
            standaloneLabel.className = 'standard-select-label';
            implicitLabel.before(standaloneLabel);
            while (implicitLabel.firstChild) standaloneLabel.append(implicitLabel.firstChild);
            implicitLabel.remove();
        }
        select.before(wrapper);
        wrapper.append(toggle, menu);
        select.classList.add('booking-service-native-select');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        function close() {
            wrapper.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            if (closeCurrent === close) closeCurrent = null;
        }
        function sync() {
            label.textContent = select.selectedOptions[0]?.textContent || select.options[0]?.textContent || name.trim();
            toggle.disabled = select.disabled;
            wrapper.classList.toggle('is-disabled', select.disabled);
            toggle.removeAttribute('aria-invalid');
            menu.replaceChildren();
            Array.from(select.options).forEach(option => {
                if (option.disabled || option.hidden) return;
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'booking-service-dropdown-item';
                item.textContent = option.textContent;
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', String(option.selected));
                item.classList.toggle('is-active', option.selected);
                item.addEventListener('click', () => {
                    select.value = option.value;
                    select.dispatchEvent(new Event('input', { bubbles: true }));
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    close(); sync(); toggle.focus();
                });
                menu.append(item);
            });
            if (select.disabled) close();
        }
        function open() {
            if (toggle.disabled) return;
            if (closeCurrent && closeCurrent !== close) closeCurrent();
            sync();
            wrapper.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
            closeCurrent = close;
        }
        toggle.addEventListener('click', () => {
            if (wrapper.classList.contains('is-open')) close();
            else { open(); (menu.querySelector('.is-active') || menu.firstElementChild)?.focus(); }
        });
        wrapper.addEventListener('keydown', event => {
            if (event.key === 'Escape' && wrapper.classList.contains('is-open')) {
                event.preventDefault(); event.stopPropagation(); close(); toggle.focus();
            } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                if (!wrapper.classList.contains('is-open')) open();
                const items = Array.from(menu.children);
                const index = items.indexOf(document.activeElement);
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
                items[next]?.focus();
            }
        });
        wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(); });
        select.addEventListener('change', sync);
        select.addEventListener('invalid', event => { event.preventDefault(); toggle.setAttribute('aria-invalid', 'true'); toggle.focus(); });
        const observer = new MutationObserver(sync);
        observer.observe(select, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label', 'value'] });
        select.form?.addEventListener('reset', () => { close(); queueMicrotask(sync); });
        sync();
    }
    function scan() { document.querySelectorAll(selector).forEach(enhance); }
    document.addEventListener('click', event => { if (!event.target.closest('.standard-select-dropdown')) closeCurrent?.(); });
    document.addEventListener('close', () => closeCurrent?.(), true);
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    scan();
})();
