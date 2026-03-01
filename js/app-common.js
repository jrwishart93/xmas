import { logout, requireAuth } from '/js/auth.js';

export function bootProtectedPage(onReady) {
  const logoutLink = document.getElementById('logoutLink');
  logoutLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
    window.location.href = '/';
  });

  requireAuth({ onReady });
}
