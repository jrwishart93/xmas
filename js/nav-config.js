export const PUBLIC_NAV_ITEMS = [
  { id: 'home', href: '/', label: 'Home', icon: 'scale' },
  { id: 'act', href: '/act/', label: 'The Act', icon: 'scroll-text' },
  { id: 'portal', href: '/login/', label: 'Member Portal', icon: 'user' },
];

export const MEMBER_NAV_ITEMS = [
  { section: 'dashboard', href: '/app/dashboard/', label: 'Dashboard', icon: 'bar-chart-3', kind: 'primary' },
  { section: 'team', href: '/app/team/', label: 'Team', icon: 'users', kind: 'primary' },
  { section: 'cases', href: '/app/issue/', label: 'Cases', icon: 'gavel', kind: 'primary' },
  { section: 'leaderboard', href: '/app/leaderboard/', label: 'Leaderboard', icon: 'trophy', kind: 'primary' },
  { section: 'disbursements', href: '/app/disbursements/', label: 'Disburse', icon: 'wallet', kind: 'secondary', previewRoute: true },
  { section: 'settings', href: '/under-construction/', label: 'Settings', icon: 'settings', kind: 'secondary' },
  { section: 'act', href: '/app/act/', label: 'Act', icon: 'scroll-text', kind: 'primary' },
];

export const MEMBER_TAB_BAR_ITEMS = MEMBER_NAV_ITEMS.filter((item) => item.kind !== 'secondary');

function normalizePathname(pathname = '') {
  const stripped = String(pathname || '')
    .split('#')[0]
    .split('?')[0]
    .replace(/\/+$/, '');

  return stripped || '/';
}

export function getPublicActiveSection(pathname = '/') {
  const normalized = normalizePathname(pathname);

  if (normalized === '/act') return 'act';
  if (normalized === '/login') return 'portal';
  if (normalized === '/') return 'home';
  return null;
}

export function getMemberActiveSection(pathname = '/') {
  const normalized = normalizePathname(pathname);

  if (normalized.startsWith('/app/team')) return 'team';
  if (normalized.startsWith('/app/leaderboard')) return 'leaderboard';
  if (
    normalized.startsWith('/app/issue') ||
    normalized.startsWith('/app/cases') ||
    normalized.startsWith('/app/scn')
  ) {
    return 'cases';
  }
  if (normalized.startsWith('/app/disbursements')) return 'disbursements';
  if (normalized.startsWith('/app/act')) return 'act';
  if (normalized.startsWith('/app/dashboard')) return 'dashboard';
  return null;
}
