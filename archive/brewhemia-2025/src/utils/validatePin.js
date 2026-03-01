// src/utils/validatePin.js
export function validatePin(pin) {
  return /^[0-9]{4}$/.test(pin);
}