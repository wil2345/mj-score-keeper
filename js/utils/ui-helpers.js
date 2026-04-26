export function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[100] font-bold text-sm transition-all duration-300 transform -translate-y-10 opacity-0 ${
        type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.remove('-translate-y-10', 'opacity-0');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('-translate-y-10', 'opacity-0');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

export function toggleTheme(onThemeChange) {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('mahjong_theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('mahjong_theme', 'dark');
    }
    
    if (onThemeChange) {
        onThemeChange();
    }
}
