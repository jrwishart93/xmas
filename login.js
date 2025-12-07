import { TEAM } from './team.js';
import { createAvatarElement, createAvatarName } from './src/utils/avatarMap.js';

const avatarGrid = document.getElementById('avatarGrid');
const pinInput = document.getElementById('pinInput');
const loginBtn = document.getElementById('loginBtn');
const errorP = document.getElementById('loginError');
const selectedUserCard = document.getElementById('selectedUserCard');
const selectedUserAnnouncement = document.getElementById('selectedUserAnnouncement');
const pinSection = document.getElementById('pinSection');
const loginForm = document.getElementById('loginForm');

let activeCard = null;
let selectedUserId = sessionStorage.getItem('selectedUser') || '';
let selectedUserName = selectedUserId && TEAM[selectedUserId]?.name ? TEAM[selectedUserId].name : '';
let lastSelectedUserId = '';
let focusTimeoutId;
let highlightTimeoutId;

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
    }, prefersReducedMotion ? 0 : 400);
}

function setLoginError(message) {
    if (!errorP) return;

    errorP.textContent = message;
    const hasMessage = Boolean(message);
    errorP.style.display = hasMessage ? 'block' : 'none';
    errorP.classList.toggle('hidden', !hasMessage);
}

function setPinErrorState(isError) {
    if (!pinInput) return;

    pinInput.setAttribute('aria-invalid', isError ? 'true' : 'false');
    pinInput.classList.toggle('input-error', isError);
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

    sessionStorage.setItem('selectedUser', userId);
    sessionStorage.setItem('selectedUserId', userId);
    sessionStorage.setItem('selectedUserName', selectedUserName || '');
    sessionStorage.setItem('selectedUserLegacyId', userId);

    if (loginForm) {
        loginForm.dataset.selectedUserId = selectedUserId;
        loginForm.dataset.selectedUserName = selectedUserName;
    }

    const isNewSelection = userId !== lastSelectedUserId;
    lastSelectedUserId = userId;

    highlightPinArea(isNewSelection);

    setLoginError('');
    setPinErrorState(false);
    renderSelectedUser(selectedUserName);

    if (selectedUserAnnouncement) {
        selectedUserAnnouncement.textContent = selectedUserName
            ? `Selected user: ${selectedUserName}`
            : '';
    }

    document.dispatchEvent(new CustomEvent('userSelectionChanged'));
}

function populateUsers() {
    if (!avatarGrid) return;

    const entries = Object.entries(TEAM);
    if (!entries.length) {
        setLoginError('No team members found.');
        return;
    }

    avatarGrid.innerHTML = '';
    entries.forEach(([id, data]) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'avatar-card';
        card.dataset.userId = id;
        card.dataset.userName = data.name;
        card.setAttribute('role', 'listitem');
        card.setAttribute('aria-pressed', 'false');
        card.setAttribute('aria-label', `Select ${data.name}`);

        let avatarVisual;
        if (data.image) {
            avatarVisual = document.createElement('img');
            avatarVisual.src = data.image;
            avatarVisual.alt = data.name;
            avatarVisual.className = 'avatar-image';
        } else {
            avatarVisual = createAvatarElement(data.name, 84);
            avatarVisual.classList.add('avatar-image', 'avatar-image--fallback');
        }

        const nameLabel = document.createElement('span');
        nameLabel.className = 'avatar-name';
        nameLabel.textContent = data.name;

        card.append(avatarVisual, nameLabel);
        avatarGrid.appendChild(card);
    });

    renderSelectedUser('');

    if (selectedUserId) {
        const existingCard = avatarGrid.querySelector(`[data-user-id="${selectedUserId}"]`);
        selectAvatarCard(existingCard);
    }
}

function showError(message) {
    setLoginError(message);
    setPinErrorState(Boolean(message));
}

function handleLogin(event) {
    event?.preventDefault();

    const selectedUser = sessionStorage.getItem('selectedUser');
    const user = TEAM[selectedUser];
    const entered = pinInput.value.trim();

    if (!user) {
        showError('Unknown user — please go back.');
        return;
    }

    if (entered === user.pin) {
        sessionStorage.setItem('loggedInUser', selectedUser);
        sessionStorage.setItem('selectedUserId', selectedUser);
        sessionStorage.setItem('selectedUserName', user.name);
        sessionStorage.setItem('selectedUserLegacyId', selectedUser);
        window.location.href = 'choices.html';
    } else {
        showError('Access denied. Hint: last 4 digits of your mobile number.');
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
    if (errorP?.textContent) {
        setLoginError('');
    }
});

setLoginError('');
setPinErrorState(false);

populateUsers();
