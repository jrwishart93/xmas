import { logout, requireAuth } from '/js/auth.js';
import { PREVIEW_MODE, UNDER_CONSTRUCTION_PATH } from '/js/config.js';

export function initIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

export function showPreviewModeIndicator() {
  if (!PREVIEW_MODE || document.getElementById('previewModeBadge')) return;

  const badge = document.createElement('div');
  badge.id = 'previewModeBadge';
  badge.className = 'preview-mode-badge';
  badge.textContent = 'Preview Mode';
  document.body.appendChild(badge);
}

export function initPreviewNavigation() {
  if (!PREVIEW_MODE) return;

  document.querySelectorAll('[data-preview-route]').forEach((link) => {
    link.setAttribute('href', UNDER_CONSTRUCTION_PATH);
  });
}

export function initPreviewGates(root = document) {
  if (!PREVIEW_MODE) return;

  root.querySelectorAll('[data-preview-gate]').forEach((element) => {
    element.classList.add('preview-gate');
    element.addEventListener('click', (event) => {
      event.preventDefault();
      window.location.href = UNDER_CONSTRUCTION_PATH;
    });
  });
}

export function bootProtectedPage(onReady) {
  const logoutLink = document.getElementById('logoutLink');
  logoutLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    await logout();
    window.location.href = '/';
  });

  initPreviewNavigation();
  showPreviewModeIndicator();
  initIcons();
  requireAuth({ onReady });
}
