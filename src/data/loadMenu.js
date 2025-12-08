// src/data/loadMenu.js
const CATEGORY_LABELS = {
  tank_and_tap_beers: "Tank & Tap Beers",
  beer_bottles_and_cans: "Beer Bottles & Cans",
  beer_flights: "Beer Flights",
  sparkling_wine: "Sparkling Wine",
  white_wine: "White Wine",
  red_wine: "Red Wine",
  rose_orange_wine: "Rosé / Orange Wine",
  cocktails: "Cocktails",
  schnapps: "Schnapps",
  alcohol_free_cocktails: "Alcohol-Free Cocktails",
  alcohol_free_beers: "Alcohol-Free Beers",
};

const SPIRIT_LABELS = {
  speciality: "Speciality",
  tequila: "Tequila",
  vodka: "Vodka",
  rum: "Rum",
};

const asNumberOrNull = (value) => {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
};

const createVariants = (items = [], sizeLabels = []) => {
  return items.flatMap((item) => {
    const variants = sizeLabels
      .map(({ field, label }) => {
        const price = asNumberOrNull(item[field]);
        if (price === null) return null;
        return { name: `${item.name} (${label})`, price };
      })
      .filter(Boolean);

    if (variants.length) return variants;

    return [
      {
        name: item.name,
        price: asNumberOrNull(item.price),
      },
    ];
  });
};

const normalizeSimpleItems = (items = []) =>
  items.map((item) => ({ name: item?.name, price: asNumberOrNull(item?.price) }));

const normalizeCustomSection = (section = {}) => {
  const items = (section.items || [])
    .map((item) => ({
      name: item?.name,
      price: asNumberOrNull(item?.price),
      description: item?.description,
    }))
    .filter((item) => item.name);

  if (!items.length) return null;

  return {
    category: section.category || section.title || "Snacks",
    title: section.title,
    type: section.type,
    offerNote: section.offerNote,
    items,
  };
};

const normalizeSpirits = (spirits = {}) => {
  const sections = [];
  Object.entries(spirits).forEach(([key, items]) => {
    const readable = SPIRIT_LABELS[key] || key;
    const normalizedItems = normalizeSimpleItems(items);
    if (normalizedItems.length) {
      sections.push({
        category: `Spirits – ${readable}`,
        items: normalizedItems,
      });
    }
  });
  return sections;
};

const normalizeMenu = (rawMenu = {}) => {
  if (Array.isArray(rawMenu)) return rawMenu; // already normalized

  const sections = [];

  Object.entries(rawMenu).forEach(([key, value]) => {
    const categoryLabel = CATEGORY_LABELS[key];

    if (key === "sections") {
      if (Array.isArray(value)) {
        value.forEach((section) => {
          const normalized = normalizeCustomSection(section);
          if (normalized) sections.push(normalized);
        });
      }
      return;
    }

    if (key === "spirits") {
      sections.push(...normalizeSpirits(value));
      return;
    }

    if (!categoryLabel) return;

    let items = [];
    if (key === "sparkling_wine") {
      items = createVariants(value, [
        { field: "price_125", label: "125ml" },
        { field: "price_bottle", label: "Bottle" },
      ]);
    } else if (key === "white_wine" || key === "red_wine" || key === "rose_orange_wine") {
      items = createVariants(value, [
        { field: "price_175", label: "175ml" },
        { field: "price_250", label: "250ml" },
        { field: "price_bottle", label: "Bottle" },
      ]);
    } else {
      items = normalizeSimpleItems(value);
    }

    if (items.length) {
      sections.push({ category: categoryLabel, items });
    }
  });

  return sections;
};

export async function fetchMenu() {
  const response = await fetch("./public/drinks.json");
  if (!response.ok) {
    throw new Error("Unable to load menu.");
  }
  const menu = await response.json();
  return normalizeMenu(menu);
}

export { normalizeMenu };
