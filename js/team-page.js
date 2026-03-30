import { TEAM } from '/archive/brewhemia-2025/team.js';
import { bootProtectedPage, initIcons } from '/js/app-common.js';
import { PREVIEW_MODE } from '/js/config.js';
import { subscribeMembers, subscribePaidContributions } from '/js/data.js';

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

function initialsFromName(name = '') {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'TS';
}

function formatRole(role = 'member') {
  return String(role || 'member')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function getUserDisplayName(ctx) {
  return ctx.membership?.displayName || ctx.user?.displayName || 'Team Member';
}

function previewMembers() {
  return Object.values(TEAM)
    .map((member) => ({
      uid: member.id,
      displayName: member.name,
      role: 'member',
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

bootProtectedPage(async (ctx) => {
  const searchInput = document.getElementById('teamSearchInput');
  const directory = document.getElementById('teamDirectory');
  const emptyState = document.getElementById('teamDirectoryEmpty');
  const directoryMeta = document.getElementById('teamDirectoryMeta');
  const totalCount = document.getElementById('teamTotalCount');
  const visibleCount = document.getElementById('teamVisibleCount');
  const currentRole = document.getElementById('teamCurrentRole');
  const currentIdentity = document.getElementById('teamCurrentIdentity');
  const teamFundTotal = document.getElementById('teamFundTotal');
  const teamFundBreakdown = document.getElementById('teamFundBreakdown');
  const teamFundMeta = document.getElementById('teamFundMeta');
  const teamFundDonut = document.getElementById('teamFundDonut');
  const teamFundTopContributor = document.getElementById('teamFundTopContributor');
  const teamFundTopline = document.getElementById('teamFundTopline');
  let activeContributor = '';
  let members = [];
  let paidScns = [];

  currentRole.textContent = formatRole(ctx.membership?.role);
  currentIdentity.textContent = getUserDisplayName(ctx);
  const updateActiveContributor = (name, options = {}) => {
    activeContributor = name;
    updateActiveState(activeContributor);
    if (options.scrollIntoView) {
      document
        .querySelector(`.team-fund-person[data-member-name="${CSS.escape(name)}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };


  const mapPaidScnsToEntries = (payments) =>
    payments.map((payment) => {
      const displayName = members.find((member) => member.uid === payment.accusedUserId)?.displayName;
      return {
        name: displayName || payment.accusedUserId || 'Unknown',
        amountPence: Number(payment.amountPaidPence || payment.amountPence || 0),
      };
    });

  const renderTeamFund = (paymentEntries = []) => {
    const byMember = paymentEntries.reduce((accumulator, entry) => {
      const key = String(entry.name || 'Unknown');
      const current = accumulator.get(key) || { name: key, totalPence: 0, entries: [] };
      const amountPence = Number(entry.amountPence || 0);
      current.totalPence += amountPence;
      current.entries.push(entry);
      accumulator.set(key, current);
      return accumulator;
    }, new Map());

    const memberRows = Array.from(byMember.values()).sort((left, right) => right.totalPence - left.totalPence);
    const totalPence = memberRows.reduce((sum, member) => sum + member.totalPence, 0);
    const highestTotal = memberRows[0]?.totalPence || 1;
    const totalSafe = totalPence || 1;

    teamFundBreakdown.innerHTML = '';
    if (memberRows.length && !activeContributor) activeContributor = memberRows[0].name;
    if (!memberRows.length) activeContributor = '';

    const colorMap = memberRows.reduce((map, member, index) => {
      map.set(member.name, memberColor(index));
      return map;
    }, new Map());

    memberRows.forEach((member, index) => {
      const row = document.createElement('article');
      row.className = 'team-fund-person';
      row.dataset.memberName = member.name;
      row.style.setProperty('--team-fund-person-color', colorMap.get(member.name));
      row.tabIndex = 0;
      if (member.name === activeContributor) row.classList.add('is-active');

      const percentage = Math.round((member.totalPence / totalSafe) * 100);
      const barWidth = Math.max(9, Math.round((member.totalPence / highestTotal) * 100));
      const totalPounds = (member.totalPence / 100).toFixed(2);
      row.innerHTML = `
        <div class="team-fund-person__head">
          <p>
            <span class="team-fund-person__dot" aria-hidden="true"></span>
            ${escapeHtml(member.name)}
          </p>
          <strong>£${totalPounds} (${percentage}%)</strong>
        </div>
        <div class="team-fund-person__bar" role="presentation">
          <span style="width: ${barWidth}%"></span>
        </div>
        <p class="team-fund-person__meta">#${index + 1} contributor • ${member.entries.length} payment${member.entries.length === 1 ? '' : 's'}</p>
      `;
      row.addEventListener('mouseenter', () => updateActiveContributor(member.name));
      row.addEventListener('focus', () => updateActiveContributor(member.name));
      row.addEventListener('click', () => updateActiveContributor(member.name));
      teamFundBreakdown.appendChild(row);
    });

    if (teamFundDonut) {
      buildDonutChart(
        teamFundDonut,
        memberRows.map((member) => ({ ...member, total: member.totalPence })),
        colorMap,
        totalSafe,
        activeContributor,
        (name) => updateActiveContributor(name, { scrollIntoView: true })
      );
      teamFundDonut.classList.remove('is-animated');
      requestAnimationFrame(() => teamFundDonut.classList.add('is-animated'));
    }

    const topContributor = memberRows[0];
    if (teamFundTopContributor) {
      teamFundTopContributor.textContent = `£${(totalPence / 100).toFixed(2)} total`;
    }
    if (teamFundTopline) {
      teamFundTopline.textContent = topContributor
        ? `Top contributor: ${topContributor.name} (£${(topContributor.totalPence / 100).toFixed(2)})`
        : 'Top contributor: —';
    }

    teamFundMeta.textContent = `${paymentEntries.length} payment${paymentEntries.length === 1 ? '' : 's'} recorded.`;

    animateNumber(teamFundTotal, totalPence / 100, { duration: 1300, formatter: (value) => `£${Number(value).toFixed(2)}` });
  };

  const render = () => {
    const membersForDirectory = members.filter((member) => String(member.role || '').toLowerCase() !== 'admin');
    const term = String(searchInput.value || '').trim().toLowerCase();
    const filteredMembers = membersForDirectory.filter((member) => {
      const haystack = [member.displayName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !term || haystack.includes(term);
    });

    totalCount.textContent = String(membersForDirectory.length);
    visibleCount.textContent = String(filteredMembers.length);
    directoryMeta.textContent = filteredMembers.length === membersForDirectory.length
      ? `${membersForDirectory.length} team member${membersForDirectory.length === 1 ? '' : 's'} in the directory.`
      : `Showing ${filteredMembers.length} of ${membersForDirectory.length} team members.`;

    directory.innerHTML = '';
    emptyState.hidden = filteredMembers.length !== 0;

    filteredMembers.forEach((member) => {
      const displayName = member.displayName || 'Team Member';
      const card = document.createElement('article');
      card.className = 'member-card member-card--directory';
      card.innerHTML = `
        <div class="member-card__head">
          <span class="member-card__avatar" aria-hidden="true">${escapeHtml(initialsFromName(displayName))}</span>
          <div class="member-card__meta">
            <strong>${escapeHtml(displayName)}</strong>
            <span>Active member</span>
          </div>
        </div>
      `;
      directory.appendChild(card);
    });

    initIcons();
  };

  searchInput.addEventListener('input', render);

  if (PREVIEW_MODE) {
    members = previewMembers();
    render();
    renderTeamFund([
      { name: 'Jamie', amountPence: 200 },
      { name: 'Paul', amountPence: 300 },
      { name: 'Chris', amountPence: 300 },
      { name: 'Jamie', amountPence: 100 },
    ]);
    return;
  }

  const unsubscribeMembers = subscribeMembers((nextMembers) => {
    members = nextMembers;
    render();
    renderTeamFund(mapPaidScnsToEntries(paidScns));
  });

  const unsubscribePayments = subscribePaidContributions((payments) => {
    paidScns = payments;
    renderTeamFund(mapPaidScnsToEntries(paidScns));
  });

  window.addEventListener(
    'beforeunload',
    () => {
      unsubscribeMembers?.();
      unsubscribePayments?.();
    },
    { once: true }
  );
});

function updateActiveState(activeName) {
  document.querySelectorAll('.team-fund-person').forEach((element) => {
    element.classList.toggle('is-active', element.dataset.memberName === activeName);
  });
  document.querySelectorAll('.team-fund-donut-segment').forEach((element) => {
    element.classList.toggle('is-active', element.dataset.memberName === activeName);
    element.classList.toggle('is-dimmed', Boolean(activeName) && element.dataset.memberName !== activeName);
  });
}

function buildDonutChart(container, memberRows, colorMap, totalSafe, activeContributor, onSelect) {
  container.innerHTML = '';
  if (!memberRows.length) return;

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'team-fund-donut__svg');
  svg.setAttribute('viewBox', '-64 -64 128 128');
  svg.setAttribute('aria-hidden', 'true');

  let startAngle = -Math.PI / 2;
  memberRows.forEach((member) => {
    const ratio = member.total / totalSafe;
    const endAngle = startAngle + ratio * Math.PI * 2;
    const segment = donutSegmentPath(startAngle, endAngle, 62, 35);
    startAngle = endAngle;

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', segment);
    path.setAttribute('fill', colorMap.get(member.name));
    path.setAttribute('class', 'team-fund-donut-segment');
    path.dataset.memberName = member.name;
    path.tabIndex = 0;
    path.addEventListener('mouseenter', () => onSelect(member.name));
    path.addEventListener('focus', () => onSelect(member.name));
    path.addEventListener('click', () => onSelect(member.name));
    svg.appendChild(path);
  });

  container.appendChild(svg);
  updateActiveState(activeContributor);
}

function donutSegmentPath(startAngle, endAngle, outerRadius, innerRadius) {
  const gapRadians = 0.02;
  const adjustedStart = startAngle + gapRadians;
  const adjustedEnd = endAngle - gapRadians;
  const safeStart = adjustedStart < adjustedEnd ? adjustedStart : startAngle;
  const safeEnd = adjustedStart < adjustedEnd ? adjustedEnd : endAngle;

  const startOuter = polarToCartesian(outerRadius, safeStart);
  const endOuter = polarToCartesian(outerRadius, safeEnd);
  const startInner = polarToCartesian(innerRadius, safeStart);
  const endInner = polarToCartesian(innerRadius, safeEnd);
  const largeArc = safeEnd - safeStart > Math.PI ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

function polarToCartesian(radius, angle) {
  return {
    x: Number((Math.cos(angle) * radius).toFixed(3)),
    y: Number((Math.sin(angle) * radius).toFixed(3)),
  };
}

function animateNumber(element, endValue, options = {}) {
  if (!element) return;
  const duration = Number(options.duration || 1000);
  const formatter = typeof options.formatter === 'function' ? options.formatter : (value) => String(value);
  const startTime = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(endValue * easedProgress);
    element.textContent = formatter(currentValue);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = formatter(endValue);
    }
  };

  requestAnimationFrame(tick);
}

function memberColor(index = 0) {
  const palette = [
    '#ff4ecb',
    '#30e7ff',
    '#9d6bff',
    '#ffbf3c',
    '#4f8cff',
    '#42f5b0',
    '#ff6b7a',
    '#7cf254',
    '#fd8dff',
    '#52c7ff',
    '#ff8e42',
    '#7f8cff',
  ];
  return palette[index % palette.length];
}
