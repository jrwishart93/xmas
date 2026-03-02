import { logout, requireAuth } from '/js/auth.js';
import { PREVIEW_MODE, UNDER_CONSTRUCTION_PATH } from '/js/config.js';

export function initIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

export function initMobileNav() {
  const mobileQuery = window.matchMedia('(max-width: 768px)');

  const updateHeaderScrollState = () => {
    document.querySelectorAll('.site-header').forEach((header) => {
      const shouldCompact = mobileQuery.matches && window.scrollY > 40;
      header.dataset.compact = shouldCompact ? 'true' : 'false';
    });
  };

  document.querySelectorAll('.header-row').forEach((headerRow, index) => {
    const nav = headerRow.querySelector('.site-nav');
    if (!nav || headerRow.querySelector('.nav-toggle')) return;

    const toggle = document.createElement('button');
    const navId = nav.id || `site-nav-${index + 1}`;
    nav.id = navId;

    toggle.className = 'nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', navId);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Toggle navigation menu');
    toggle.innerHTML = `
      <span class="nav-toggle-line"></span>
      <span class="nav-toggle-line"></span>
      <span class="nav-toggle-line"></span>
    `;

    toggle.addEventListener('click', () => {
      const open = nav.dataset.open === 'true';
      nav.dataset.open = open ? 'false' : 'true';
      toggle.setAttribute('aria-expanded', String(!open));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav.dataset.open = 'false';
        toggle.setAttribute('aria-expanded', 'false');
      });
    });

    headerRow.classList.add('has-mobile-nav');
    headerRow.insertBefore(toggle, nav);
  });

  updateHeaderScrollState();
  window.addEventListener('scroll', updateHeaderScrollState, { passive: true });
  mobileQuery.addEventListener('change', updateHeaderScrollState);
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
  initMobileNav();
  initIcons();
  requireAuth({ onReady });
}
