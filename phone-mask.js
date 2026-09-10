function formatBrazilianPhone(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function bindPhoneMask(input) {
    if (!input || input.dataset.phoneMaskBound) return;
    input.dataset.phoneMaskBound = 'true';
    input.addEventListener('input', () => { input.value = formatBrazilianPhone(input.value); });
    input.value = formatBrazilianPhone(input.value);
}

function bindPhoneMasks(root = document) {
    if (root.matches?.('[data-phone-mask], input[type="tel"]')) bindPhoneMask(root);
    root.querySelectorAll?.('[data-phone-mask], input[type="tel"]').forEach(bindPhoneMask);
}

bindPhoneMasks();
new MutationObserver((entries) => entries.forEach((entry) => entry.addedNodes.forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) bindPhoneMasks(node);
}))).observe(document.documentElement, { childList: true, subtree: true });
