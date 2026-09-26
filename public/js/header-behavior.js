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

if (sharedNavToggle && sharedNavMenu) {
    sharedNavToggle.addEventListener('click', () => {
        sharedNavToggle.classList.toggle('open');
        sharedNavMenu.classList.toggle('open');
    });
    sharedNavMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => sharedNavMenu.classList.remove('open')));
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
        sharedNavToggle?.classList.remove('open');
        sharedNavMenu?.classList.remove('open');

        if (typeof window.openBookingAuthDialogForAccount === 'function' && window.openBookingAuthDialogForAccount()) return;

        window.location.href = '/index.html?auth=account';
    });
}

updateSharedAccountLink();
window.addEventListener('pageshow', updateSharedAccountLink);
