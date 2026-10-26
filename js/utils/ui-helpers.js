export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Format a score for display; trims trailing .0 when whole. */
export function formatScore(value, { signed = false } = {}) {
    const n = Math.round(Number(value) * 10) / 10;
    const body = Number.isInteger(n) ? String(n) : n.toFixed(1);
    if (signed && n > 0) return `+${body}`;
    return body;
}

export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[100] font-bold text-sm transition-all duration-300 transform -translate-y-10 opacity-0 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.remove('-translate-y-10', 'opacity-0');
    });

    setTimeout(() => {
        notification.classList.add('-translate-y-10', 'opacity-0');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

export function toggleTheme(onThemeChange) {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('mahjong_theme', isDark ? 'dark' : 'light');
    if (onThemeChange) onThemeChange();
}

/** Safely remove a modal node if it is still attached. */
export function closeModal(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}
