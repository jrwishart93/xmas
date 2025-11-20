import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { createAvatarElement, createAvatarName, getAvatarUrl } from './src/utils/avatarMap.js';

const avatarGrid = document.getElementById('avatarGrid');
const pinInput = document.getElementById('pinInput');
const loginBtn = document.getElementById('loginBtn');
const errorP = document.getElementById('loginError');
const successMsg = document.getElementById('successMsg');
const spinner = document.getElementById('loginSpinner');
const loginBtnDefaultText = loginBtn?.innerHTML || '';
const selectedUserCard = document.getElementById('selectedUserCard');
const selectedUserAnnouncement = document.getElementById('selectedUserAnnouncement');
const pinSection = document.getElementById('pinSection');
const loginForm = document.getElementById('loginForm');
const pinLabel = document.querySelector('label[for="pinInput"]');

let activeCard = null;
let selectedUserId = '';
let selectedUserName = '';
let lastSelectedUserId = '';
let focusTimeoutId;
let highlightTimeoutId;

function highlightPinArea(shouldScroll) {
    if (!pinSection) return;
    pinSection.classList.remove('hidden');
    pinSection.classList.add('pin-section--highlight');

    if (shouldScroll) {
        pinSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (highlightTimeoutId) {
        clearTimeout(highlightTimeoutId);
    }

    highlightTimeoutId = setTimeout(() => {
        pinSection.classList.remove('pin-section--highlight');
    }, 900);
}

function focusPinLabelAfterScroll() {
    const focusTarget = pinLabel || pinInput;
    if (!focusTarget) return;

    if (pinInput && !pinInput.hasAttribute('tabindex')) {
        pinInput.setAttribute('tabindex', '-1');
    }

    if (!focusTarget.hasAttribute('tabindex')) {
        focusTarget.setAttribute('tabindex', '-1');
    }

    if (focusTimeoutId) {
        clearTimeout(focusTimeoutId);
    }

    focusTimeoutId = setTimeout(() => {
        focusTarget.focus({ preventScroll: true });
    }, 450);
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

    if (loginForm) {
        loginForm.dataset.selectedUserId = selectedUserId;
        loginForm.dataset.selectedUserName = selectedUserName;
    }

    const isNewSelection = userId !== lastSelectedUserId;
    lastSelectedUserId = userId;

    highlightPinArea(isNewSelection);
    if (isNewSelection) {
        focusPinLabelAfterScroll();
    }

    errorP.textContent = '';
    renderSelectedUser(selectedUserName);

    if (selectedUserAnnouncement) {
        selectedUserAnnouncement.textContent = selectedUserName
            ? `Selected user: ${selectedUserName}`
            : '';
    }

    document.dispatchEvent(new CustomEvent('userSelectionChanged'));
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

function resetLoginUiWithError(message) {
    if (errorP) {
        errorP.textContent = message;
    }

    if (successMsg) {
        successMsg.classList.add('hidden');
        successMsg.classList.remove('glow-text');
    }

    if (spinner) {
        spinner.hidden = true;
    }

    if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.innerHTML = loginBtnDefaultText || 'CHECK LIST';
    }

    if (pinInput) {
        pinInput.focus({ preventScroll: true });
    }
}

async function populateUsers() {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (userList.length === 0) {
            errorP.textContent = 'No users found in the database.';
            return;
        }

        if (!avatarGrid) {
            errorP.textContent = 'Unable to load avatars.';
            return;
        }

        avatarGrid.innerHTML = '';
        userList.forEach(user => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'avatar-card';
            card.dataset.userId = user.id;
            card.dataset.userName = user.name;
            card.setAttribute('role', 'listitem');
            card.setAttribute('aria-pressed', 'false');
            card.setAttribute('aria-label', `Select ${user.name}`);

            const avatarUrl = getAvatarUrl(user.name);
            let avatarVisual;

            if (avatarUrl) {
                avatarVisual = document.createElement('img');
                avatarVisual.src = avatarUrl;
                avatarVisual.alt = user.name;
                avatarVisual.className = 'avatar-image';
            } else {
                avatarVisual = createAvatarElement(user.name, 84);
                avatarVisual.classList.add('avatar-image', 'avatar-image--fallback');
            }

            const nameLabel = document.createElement('span');
            nameLabel.className = 'avatar-name';
            nameLabel.textContent = user.name;

            card.append(avatarVisual, nameLabel);
            avatarGrid.appendChild(card);
        });

        renderSelectedUser('');
    } catch (err) {
        console.error(err);
        errorP.textContent = 'Failed to load users from Firestore.';
    }
}

function startLoginUiState() {
    if (errorP) {
        errorP.textContent = '';
    }

    if (spinner) {
        spinner.hidden = false;
    }

    if (successMsg) {
        successMsg.classList.add('hidden');
        successMsg.classList.remove('glow-text');
    }

    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="flicker-fast">VERIFYING...</span>';
    }
}

function handleAccessDenied() {
    resetLoginUiWithError('Access denied. Hint: your PIN is the last 4 digits of your mobile number.');

    if (pinInput) {
        pinInput.classList.add('input-error');
        setTimeout(() => pinInput.classList.remove('input-error'), 450);
        pinInput.focus({ preventScroll: true });
    }
}

async function handleLogin(event) {
    event?.preventDefault();
    startLoginUiState();

    const userId = loginForm?.dataset.selectedUserId || selectedUserId;
    const pin = pinInput.value.trim();

    if (!userId) {
        resetLoginUiWithError('Please select your name.');
        return;
    }

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            handleAccessDenied();
            return;
        }

        const expectedPin = userSnap.data().password;

        if (pin !== expectedPin) {
            handleAccessDenied();
            return;
        }

        localStorage.setItem("xmasUser", userSnap.id);
        // Keep a secondary key for compatibility with older pages/modules
        localStorage.setItem("currentUser", userSnap.id);
        window.location.href = 'choices.html';
    } catch (err) {
        console.error('Login failed:', err);
        resetLoginUiWithError('Something went wrong verifying your details. Please check your PIN and try again.');
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

populateUsers();
