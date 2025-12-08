import { TEAM, getAvatarSrc, normalizeAvatarPath, normaliseTeamId, toLegacyId } from './team.js';
import { createAvatarElement, createAvatarName } from './src/utils/avatarMap.js';
import { fetchUsersFromFirestore } from './src/data/users.js';

const avatarGrid = document.getElementById('avatarGrid');
const pinInput = document.getElementById('pinInput');
const loginBtn = document.getElementById('loginBtn');
const pinError = document.getElementById('pinError');
const selectedUserCard = document.getElementById('selectedUserCard');
const selectedUserAnnouncement = document.getElementById('selectedUserAnnouncement');
const pinSection = document.getElementById('pinSection');
const loginForm = document.getElementById('loginForm');

let activeCard = null;
let selectedUserId = normaliseTeamId(sessionStorage.getItem('selectedUser') || '');
let selectedUserName = selectedUserId && TEAM[selectedUserId]?.name ? TEAM[selectedUserId].name : '';
let lastSelectedUserId = '';
let focusTimeoutId;
let highlightTimeoutId;
let errorTimeoutId;

function scrollToPinAndFocus() {
    if (!pinInput) return;

    const target = pinSection || pinInput;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    target?.scrollIntoView({
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
        block: 'center',
    });

    if (focusTimeoutId) {
        clearTimeout(focusTimeoutId);
    }

    focusTimeoutId = setTimeout(() => {
        pinInput.focus({ preventScroll: true });
        pinInput.select();
    }, prefersReducedMotion ? 0 : 400);
}

function setPinErrorState(isError) {
    if (!pinInput) return;

    pinInput.setAttribute('aria-invalid', isError ? 'true' : 'false');
    pinInput.classList.toggle('input-error', isError);
}

function showError(message) {
    if (!pinError) return;

    if (errorTimeoutId) {
        clearTimeout(errorTimeoutId);
    }

    pinError.textContent = message;
    pinError.classList.add('show');

    errorTimeoutId = setTimeout(() => pinError?.classList.remove('show'), 4000);
}

function clearError() {
    if (!pinError) return;
    if (errorTimeoutId) {
        clearTimeout(errorTimeoutId);
    }

    pinError.textContent = '';
    pinError.classList.remove('show');
}

function highlightPinArea(shouldScroll) {
    if (!pinSection) return;
    pinSection.classList.remove('hidden');
    pinSection.classList.add('pin-section--highlight');

    if (shouldScroll) {
        scrollToPinAndFocus();
    }

    if (highlightTimeoutId) {
        clearTimeout(highlightTimeoutId);
    }

    highlightTimeoutId = setTimeout(() => {
        pinSection.classList.remove('pin-section--highlight');
    }, 900);
}

function renderSelectedUser(name) {
    if (!selectedUserCard) return;
    selectedUserCard.innerHTML = '';

    if (!name) {
        selectedUserCard.classList.add('hidden');
        return;
    }

    const intro = document.createElement('p');
    intro.className = 'muted-text selected-user-subtitle';
    intro.textContent = 'You are logging in as';

    const avatarRow = createAvatarName(name, 46);
    avatarRow.classList.add('selected-user-row');

    selectedUserCard.append(intro, avatarRow);
    selectedUserCard.classList.remove('hidden');
}

function selectAvatarCard(card) {
    if (!card) return;

    if (activeCard) {
        activeCard.classList.remove('selected', 'avatar-card--selected');
        activeCard.setAttribute('aria-pressed', 'false');
    }

    activeCard = card;
    activeCard.classList.add('selected');
    activeCard.setAttribute('aria-pressed', 'true');

    const userId = card.dataset.userId;
    selectedUserId = userId;
    selectedUserName = card.dataset.userName;

    sessionStorage.setItem('loggedInUser', userId);
    sessionStorage.setItem('selectedUser', userId);
    sessionStorage.setItem('selectedUserId', userId);
    sessionStorage.setItem('selectedUserName', selectedUserName || '');
    sessionStorage.setItem('selectedUserLegacyId', toLegacyId(userId));

    if (loginForm) {
        loginForm.dataset.selectedUserId = selectedUserId;
        loginForm.dataset.selectedUserName = selectedUserName;
    }

    lastSelectedUserId = userId;

    highlightPinArea(true);

    clearError();
    setPinErrorState(false);
    renderSelectedUser(selectedUserName);

    if (selectedUserAnnouncement) {
        selectedUserAnnouncement.textContent = selectedUserName
            ? `Selected user: ${selectedUserName}`
            : '';
    }

    document.dispatchEvent(new CustomEvent('userSelectionChanged'));
}

async function populateUsers() {
    if (!avatarGrid) return;

    const remoteUsers = await fetchUsersFromFirestore();
    const entries = Object.entries(TEAM);
    if (!entries.length) {
        showError('No team members found.');
        return;
    }

    avatarGrid.innerHTML = '';
    entries.forEach(([id, data]) => {
        const remoteData = remoteUsers[id] || {};
        const displayName = remoteData.name || data.name;
        const avatarUrl = normalizeAvatarPath(
            remoteData.avatarUrl || remoteData.avatar || data.avatar || getAvatarSrc(id)
        );

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'avatar-card';
        card.dataset.userId = id;
        card.dataset.userName = displayName;
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-pressed', 'false');
        card.setAttribute('aria-label', `Select ${displayName}`);

        let avatarVisual;
        if (avatarUrl) {
            avatarVisual = document.createElement('img');
            avatarVisual.src = avatarUrl;
            avatarVisual.alt = displayName;
            avatarVisual.className = 'avatar-image';
        } else {
            avatarVisual = createAvatarElement(displayName, 84);
            avatarVisual.classList.add('avatar-image', 'avatar-image--fallback');
        }

        const nameLabel = document.createElement('span');
        nameLabel.className = 'avatar-name';
        nameLabel.textContent = displayName;

        const isUnavailable = Boolean(remoteData.unavailable || data.unavailable);
        if (isUnavailable) {
            card.classList.add('avatar-card--unavailable');
            card.disabled = true;
            card.setAttribute('aria-disabled', 'true');
            card.setAttribute('title', `${displayName} is not attending`);
        }

        card.append(avatarVisual, nameLabel);
        avatarGrid.appendChild(card);
    });

    renderSelectedUser('');

    if (selectedUserId) {
        const existingCard = avatarGrid.querySelector(`[data-user-id="${selectedUserId}"]`);
        selectAvatarCard(existingCard);
    }
}

function handleLogin(event) {
    event?.preventDefault();

    const selectedUser = normaliseTeamId(sessionStorage.getItem('selectedUser'));
    const user = TEAM[selectedUser];
    const entered = pinInput.value.trim();

    if (!user) {
        showError('Unknown user — please go back.');
        setPinErrorState(true);
        return;
    }

    if (entered === user.pin) {
        sessionStorage.setItem('loggedInUser', selectedUser);
        sessionStorage.setItem('selectedUserId', selectedUser);
        sessionStorage.setItem('selectedUserName', user.name);
        sessionStorage.setItem('selectedUserLegacyId', toLegacyId(selectedUser));
        window.location.href = 'choices.html';
    } else {
        showError('Access denied. Hint: last 4 digits of your mobile number.');
        setPinErrorState(true);
    }
}

loginForm?.addEventListener('submit', handleLogin);
loginBtn?.addEventListener('click', handleLogin);

avatarGrid?.addEventListener('click', (event) => {
    const card = event.target.closest('.avatar-card');
    selectAvatarCard(card);
});

avatarGrid?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.avatar-card');
    if (!card) return;
    event.preventDefault();
    selectAvatarCard(card);
});

pinInput?.addEventListener('input', () => {
    setPinErrorState(false);
    if (pinError?.textContent) {
        clearError();
    }
});

clearError();
setPinErrorState(false);

populateUsers();
