export async function loadAct() {
  const response = await fetch('/data/act.json');
  if (!response.ok) throw new Error('Unable to load Act data');
  return response.json();
}

export function flattenClauses(actSections) {
  return actSections.flatMap((section) => section.clauses);
}
