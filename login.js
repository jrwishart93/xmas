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

let activeCard = null;
let selectedUserId = '';
let selectedUserName = '';
let lastSelectedUserId = '';
let selectedUser = null;
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

function setSpinnerVisible(isVisible) {
    if (!spinner) return;
    spinner.hidden = !isVisible;
    spinner.setAttribute('aria-hidden', (!isVisible).toString());
    spinner.classList.toggle('hidden', !isVisible);
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
    selectedUser = {
        name: selectedUserName,
        legacyId: selectedUserId,
    };

    if (loginForm) {
        loginForm.dataset.selectedUserId = selectedUserId;
        loginForm.dataset.selectedUserName = selectedUserName;
        delete loginForm.dataset.selectedUserUid;
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
    setLoginError(message);
    setSpinnerVisible(false);

    if (successMsg) {
        successMsg.classList.add('hidden');
        successMsg.classList.remove('glow-text');
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
            setLoginError('No users found in the database.');
            return;
        }

        if (!avatarGrid) {
            setLoginError('Unable to load avatars.');
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
        setLoginError('Failed to load users from Firestore.');
    }
}

function startLoginUiState() {
    setLoginError('');
    setPinErrorState(false);
    setSpinnerVisible(true);

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
    resetLoginUiWithError('Access denied. Hint: your PIN is the last four digits of your mobile number.');
    setPinErrorState(true);

    if (pinInput) {
        pinInput.value = '';
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
        setPinErrorState(false);
        return;
    }

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.error('User not found for login attempt:', userId);
            handleAccessDenied();
            return;
        }

        const userData = userSnap.data();
        const expectedPin = userData.password;

        if (pin !== expectedPin) {
            handleAccessDenied();
            return;
        }

        const resolvedUserId = userData?.choiceId || userId;
        const resolvedLegacyId = userData?.legacyId || userId;
        const resolvedName = userData?.name || selectedUserName || userId;

        setSpinnerVisible(false);
        setLoginError('');
        setPinErrorState(false);
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = loginBtnDefaultText || 'CHECK LIST';
        }

        localStorage.setItem("xmasUser", resolvedUserId);
        localStorage.setItem("xmasUserUid", resolvedUserId);
        localStorage.setItem("currentUser", resolvedUserId);
        localStorage.setItem("xmasUserName", resolvedName);
        localStorage.setItem("xmasUserLegacyId", resolvedLegacyId);
        localStorage.setItem("xmasUserIsAdmin", userData?.admin ? 'true' : 'false');

        window.location.href = 'choices.html';
    } catch (err) {
        console.error('Login failed:', err);
        resetLoginUiWithError('Something went wrong, please try again.');
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
    if (errorP?.textContent) {
        setLoginError('');
    }
});

setLoginError('');
setPinErrorState(false);

populateUsers();
