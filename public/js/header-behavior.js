const sharedHeader = document.getElementById('siteHeader');
const sharedNavToggle = document.getElementById('navToggle');
const sharedNavMenu = document.getElementById('navMenu');
const sharedAccountLink = document.getElementById('accountHeaderLink');
const sharedAccountName = document.getElementById('accountHeaderName');

function sharedAccountSession() {
    try {
        return JSON.parse(localStorage.getItem('smf-account') || 'null');
    } catch {
        localStorage.removeItem('smf-account');
        return null;
    }
}

function hasSharedAccountSession() {
    const account = sharedAccountSession();
    return Boolean(account?.token && account?.client?.id);
}

function updateSharedAccountLink() {
    const account = sharedAccountSession();
    const name = account?.client?.name;
    const icon = sharedAccountLink?.querySelector('i');

    if (sharedAccountLink) {
        sharedAccountLink.setAttribute('aria-label', name ? `Olá, ${name}` : 'Minha Conta');
        sharedAccountLink.title = name ? `Olá, ${name}` : 'Minha Conta';
    }
    if (sharedAccountName) {
        sharedAccountName.textContent = name ? `Olá, ${name}` : '';
        sharedAccountName.hidden = !name;
    }
    if (icon) icon.hidden = Boolean(name);
}

function setSharedNavState(isOpen) {
    if (!sharedNavToggle || !sharedNavMenu) return;
    sharedNavToggle.classList.toggle('open', isOpen);
    sharedNavMenu.classList.toggle('open', isOpen);
    sharedNavToggle.setAttribute('aria-expanded', String(isOpen));
    sharedNavToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
}

if (sharedNavToggle && sharedNavMenu) {
    sharedNavToggle.addEventListener('click', () => setSharedNavState(!sharedNavMenu.classList.contains('open')));
    sharedNavMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setSharedNavState(false)));
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setSharedNavState(false);
    });
}

if (sharedHeader) {
    const updateHeaderState = () => sharedHeader.classList.toggle('scrolled', window.scrollY > 40);
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
}

if (sharedAccountLink) {
    sharedAccountLink.addEventListener('click', (event) => {
        if (hasSharedAccountSession()) return;

        event.preventDefault();
        setSharedNavState(false);

        if (typeof window.openBookingAuthDialogForAccount === 'function' && window.openBookingAuthDialogForAccount()) return;

        window.location.href = '/index.html?auth=account';
    });
}

updateSharedAccountLink();
window.addEventListener('pageshow', updateSharedAccountLink);
