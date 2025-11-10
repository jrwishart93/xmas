// src/data/loadMenu.js
export async function fetchMenu() {
  const response = await fetch("./public/drinks.json");
  if (!response.ok) {
    throw new Error("Unable to load menu.");
  }
  const menu = await response.json();
  return menu;
}
