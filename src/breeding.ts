export type Lineage = { id: string; sireId?: string; damId?: string };

// Approximate gestation and heat-cycle lengths in days
export const GESTATION: Record<string, number> = { Goat: 150, Sheep: 150, Cattle: 283 };
export const CYCLE: Record<string, number> = { Goat: 21, Sheep: 17, Cattle: 21 };
export const MALE_TYPES = ['Buck', 'Ram', 'Bull', 'Male', 'Rooster'];
export const FEMALE_TYPES = ['Doe', 'Ewe', 'Cow', 'Hen', 'Female'];

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Parents and grandparents (two generations) of an animal
export function ancestors(id: string, all: Lineage[]): Set<string> {
  const out = new Set<string>();
  const byId = new Map(all.map(x => [x.id, x]));
  const walk = (pid: string | undefined, depth: number) => {
    if (!pid || depth > 2) return;
    out.add(pid);
    const p = byId.get(pid);
    if (p) { walk(p.sireId, depth + 1); walk(p.damId, depth + 1); }
  };
  const me = byId.get(id);
  if (me) { walk(me.sireId, 1); walk(me.damId, 1); }
  return out;
}

// Returns a warning when two animals are closely related, or an empty string
export function inbreedingWarning(aId: string | undefined, bId: string | undefined, all: Lineage[]): string {
  if (!aId || !bId) return '';
  if (aId === bId) return 'An animal cannot be paired with itself.';
  const A = ancestors(aId, all), B = ancestors(bId, all);
  if (A.has(bId) || B.has(aId)) return 'One is a parent or grandparent of the other.';
  for (const x of A) if (B.has(x)) return 'They share a parent or grandparent, so their offspring would be inbred.';
  return '';
}

// Average daily gain in grams per day from the first to the last weighing
export function adg(weights: { date: string; weight: string | number }[]): number | null {
  const w = [...weights].filter(x => x.date && Number(x.weight) > 0).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (w.length < 2) return null;
  const days = (Date.parse(String(w[w.length - 1].date).slice(0, 10)) - Date.parse(String(w[0].date).slice(0, 10))) / 86400000;
  if (days <= 0) return null;
  return Math.round(((Number(w[w.length - 1].weight) - Number(w[0].weight)) / days) * 1000);
}
