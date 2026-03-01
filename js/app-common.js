import { logout, requireAuth } from '/js/auth.js';

export function initIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

export function bootProtectedPage(onReady) {
  const logoutLink = document.getElementById('logoutLink');
  logoutLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
    window.location.href = '/';
  });

  initIcons();
  requireAuth({ onReady });
}
