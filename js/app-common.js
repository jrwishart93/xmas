import { logout, requireAuth } from '/js/auth.js';
import { PREVIEW_MODE, UNDER_CONSTRUCTION_PATH } from '/js/config.js';

const HEADER_NAV_ITEMS = [
  { section: 'dashboard', href: '/app/dashboard/', label: 'Dashboard', icon: 'bar-chart-3' },
  { section: 'team', href: '/app/team/', label: 'Team', icon: 'users' },
  { section: 'cases', href: '/app/issue/', label: 'Cases', icon: 'gavel' },
  { section: 'leaderboard', href: '/app/leaderboard/', label: 'Leaderboard', icon: 'trophy' },
  { section: 'disbursements', href: '/app/disbursements/', label: 'Disburse', icon: 'wallet', previewRoute: true },
  { section: 'act', href: '/app/act/', label: 'Act', icon: 'scroll-text' },
];

const TAB_BAR_ITEMS = HEADER_NAV_ITEMS.filter((item) => item.section !== 'disbursements');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] || character;
  });
}

function getActiveSection(pathname = window.location.pathname) {
  if (pathname.startsWith('/app/team/')) return 'team';
  if (pathname.startsWith('/app/leaderboard/')) return 'leaderboard';
  if (pathname.startsWith('/app/issue/') || pathname.startsWith('/app/cases/') || pathname.startsWith('/app/scn/')) return 'cases';
  if (pathname.startsWith('/app/disbursements/')) return 'disbursements';
  if (pathname.startsWith('/app/act/')) return 'act';
  return 'dashboard';
}

function formatRoleLabel(role = 'member') {
  return String(role || 'member')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function getDisplayName(ctx) {
  const explicitName = ctx.membership?.displayName || ctx.user?.displayName;
  if (explicitName?.trim()) return explicitName.trim();

  const email = ctx.user?.email || '';
  if (email.includes('@')) return email.split('@')[0];

  return 'Team Member';
}

function getSessionInitials(name, fallback = 'TS') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return fallback;
}

function buildNavLink(item, activeSection) {
  const current = item.section === activeSection ? ' aria-current="page"' : '';
  const previewRoute = item.previewRoute ? ' data-preview-route' : '';
  return `
    <a href="${item.href}" class="nav-link" data-app-section="${item.section}"${current}${previewRoute}>
      <i data-lucide="${item.icon}" class="icon"></i>${item.label}
    </a>
  `;
}

function buildLogoutLink() {
  return `
    <a href="#" id="logoutLink" class="nav-link nav-link--logout">
      <i data-lucide="log-out" class="icon"></i>Logout
    </a>
  `;
}

function wireLogoutLink() {
  const logoutLink = document.getElementById('logoutLink');
  if (!logoutLink || logoutLink.dataset.bound === 'true') return;

  logoutLink.dataset.bound = 'true';
  logoutLink.addEventListener('click', async (event) => {
    event.preventDefault();

    if (logoutLink.dataset.loading === 'true') return;
    logoutLink.dataset.loading = 'true';
    logoutLink.setAttribute('aria-disabled', 'true');

    try {
      await logout();
    } catch (error) {
      console.error('Logout failed, forcing return to home page.', error);
    } finally {
      window.location.href = '/';
    }
  });
}

function ensureAppNavMeta(headerRow) {
  if (!headerRow) return { nav: null, meta: null };

  let nav = headerRow.querySelector('.site-nav');
  let meta = headerRow.querySelector('.app-nav-meta');

  if (!meta) {
    meta = document.createElement('div');
    meta.className = 'app-nav-meta';
    headerRow.appendChild(meta);
  }

  if (nav && nav.parentElement !== meta) {
    meta.prepend(nav);
  }

  return { nav, meta };
}

function renderDesktopNav(nav, activeSection) {
  if (!nav) return;
  nav.innerHTML = `${HEADER_NAV_ITEMS.map((item) => buildNavLink(item, activeSection)).join('')}${buildLogoutLink()}`;
}

function renderSessionPill(meta, ctx) {
  if (!meta) return;

  const displayName = getDisplayName(ctx);
  const roleLabel = formatRoleLabel(ctx.membership?.role);
  const email = ctx.user?.email || '';
  const initials = getSessionInitials(displayName);
  let pill = meta.querySelector('.app-session-pill');

  if (!pill) {
    pill = document.createElement('div');
    pill.className = 'app-session-pill';
    meta.appendChild(pill);
  }

  pill.innerHTML = `
    <span class="session-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
    <span class="session-meta">
      <strong>${escapeHtml(displayName)}</strong>
      <span>${escapeHtml(roleLabel)}${email ? ` \u00b7 ${escapeHtml(email)}` : ''}</span>
    </span>
    <span class="session-presence">Logged in</span>
  `;
}

function renderTabBar(activeSection) {
  let tabBar = document.querySelector('.app-tabbar');
  if (!tabBar) {
    tabBar = document.createElement('nav');
    tabBar.className = 'app-tabbar';
    tabBar.setAttribute('aria-label', 'Primary app navigation');
    document.body.appendChild(tabBar);
  }

  tabBar.innerHTML = TAB_BAR_ITEMS.map((item) => {
    const current = item.section === activeSection ? ' aria-current="page"' : '';
    return `
      <a href="${item.href}" class="app-tabbar-link" data-app-section="${item.section}"${current}>
        <i data-lucide="${item.icon}" class="icon"></i>
        <span>${item.label}</span>
      </a>
    `;
  }).join('');
}

function enhanceProtectedChrome(ctx) {
  const activeSection = getActiveSection();
  const header = document.querySelector('.site-header');
  const headerRow = header?.querySelector('.header-row') || header?.querySelector('.site-shell');
  const main = document.querySelector('main');
  const brand = headerRow?.querySelector('.brand, .section-header');
  const { nav, meta } = ensureAppNavMeta(headerRow);

  document.body.classList.add('protected-app');
  document.body.dataset.appSection = activeSection;
  header?.classList.add('app-site-header');
  headerRow?.classList.add('app-header-row');
  main?.classList.add('app-main-shell');
  brand?.classList.add('app-page-title');

  renderDesktopNav(nav, activeSection);
  renderSessionPill(meta, ctx);
  renderTabBar(activeSection);
  wireLogoutLink();
}

export function initIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

export function initMobileNav() {
  const mobileQuery = window.matchMedia('(max-width: 768px)');
  const isProtectedApp = document.body.classList.contains('protected-app');
  const isPublicApp = !isProtectedApp;

  const updateHeaderScrollState = () => {
    document.querySelectorAll('.site-header').forEach((header) => {
      const shouldCompact = mobileQuery.matches && window.scrollY > 40;
      header.dataset.compact = shouldCompact ? 'true' : 'false';
    });
  };

  const navContainers = document.querySelectorAll('.header-row, .site-header > .site-shell');

  navContainers.forEach((headerRow, index) => {
    const nav = headerRow.querySelector('.site-nav');
    if (!nav || headerRow.querySelector('.nav-toggle')) return;

    if (isProtectedApp) {
      headerRow.classList.add('has-mobile-nav');
      return;
    }

    if (isPublicApp) {
      headerRow.classList.add('mobile-bottom-nav');
      nav.dataset.open = 'true';
      return;
    }

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
  requireAuth({
    onReady: async (ctx) => {
      enhanceProtectedChrome(ctx);
      initPreviewNavigation();
      showPreviewModeIndicator();
      initMobileNav();
      initIcons();
      await onReady(ctx);
      initIcons();
    },
  });
}
