(() => {
    const hoursList = document.getElementById('footerBusinessHours');
    if (!hoursList) return;

    const days = [
        { id: 1, label: 'Segunda' },
        { id: 2, label: 'Terça' },
        { id: 3, label: 'Quarta' },
        { id: 4, label: 'Quinta' },
        { id: 5, label: 'Sexta' },
        { id: 6, label: 'Sábado' },
        { id: 0, label: 'Domingo' },
    ];

    const formatTime = (time) => String(time).replace(/^(\d{2}):(\d{2})$/, (_, hour, minute) =>
        minute === '00' ? `${hour}h` : `${hour}h${minute}`);

    window.siteBusinessHoursPromise = fetch('/api/schedule-settings', { cache: 'no-store' })
        .then(async (response) => {
            const settings = await response.json().catch(() => ({}));
            if (!response.ok || !Array.isArray(settings.days)) {
                throw new Error(settings.error || 'Não foi possível carregar os horários.');
            }
            return settings;
        });

    window.siteBusinessHoursPromise.then((settings) => {
        const configured = new Map(settings.days.map((day) => [Number(day.day_of_week), day]));
        hoursList.replaceChildren();

        days.forEach(({ id, label }) => {
            const day = configured.get(id);
            const row = document.createElement('li');
            row.className = 'site-footer-hours-row';
            const name = document.createElement('span');
            name.textContent = label;
            const time = document.createElement('span');
            time.textContent = day?.is_active
                ? `${formatTime(day.opening_time)} às ${formatTime(day.closing_time)}`
                : 'Fechado';
            if (!day?.is_active) row.classList.add('is-closed');
            row.append(name, time);
            hoursList.append(row);
        });
        hoursList.setAttribute('aria-busy', 'false');
    }).catch(() => {
        hoursList.replaceChildren();
        const message = document.createElement('li');
        message.className = 'site-footer-hours-message';
        message.textContent = 'Horários indisponíveis no momento.';
        hoursList.append(message);
        hoursList.setAttribute('aria-busy', 'false');
    });
})();
