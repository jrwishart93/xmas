export const AVATAR_MAP = {
  "Paul E": "public/IMG_2510.png",
  "James W": "public/IMG_2514.png",
  "Adam J": "public/IMG_2515.png",
  "Adam B": "public/IMG_2517.png",
  "Derek N": "public/IMG_2518.png",
  "Jo M": "public/IMG_2519.png",
  "Lawrie C": "public/IMG_2520.png",
  "Steve H": "public/IMG_2524.png",
  "Chris B": "public/IMG_2528.png",
};

export function getAvatarUrl(name) {
  if (!name) return null;
  const trimmed = name.trim();
  return AVATAR_MAP[trimmed] || null;
}

export function getInitials(name) {
  if (!name) return "?";
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase());

  return parts.join("") || "?";
}

export function createAvatarElement(name, size = 36) {
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.style.setProperty("--avatar-size", `${size}px`);

  const url = getAvatarUrl(name);
  if (url) {
    avatar.classList.add("avatar--image");
    avatar.style.backgroundImage = `url(${url})`;
  } else {
    avatar.classList.add("avatar--initials");
    avatar.textContent = getInitials(name);
  }

  avatar.setAttribute("aria-hidden", "true");
  return avatar;
}

export function createAvatarName(name, size = 36) {
  const wrapper = document.createElement("div");
  wrapper.className = "avatar-name";

  const avatar = createAvatarElement(name, size);
  const label = document.createElement("span");
  label.className = "avatar-name__label";
  label.textContent = name || "Unknown guest";

  wrapper.append(avatar, label);
  return wrapper;
}
