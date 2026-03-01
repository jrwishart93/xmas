// src/auth/logout.js
export function logoutUser() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}
