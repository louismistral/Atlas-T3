// [Atlas] A3 : part de la semaine écoulée, du vendredi 00:00 (heure locale) au vendredi suivant.
const WEEK_MS = 7 * 86_400_000;

export function weekElapsed(now: number): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 2) % 7)); // vendredi = 5
  return Math.min(1, (now - start.getTime()) / WEEK_MS);
}

// Somme des quotas semaine et écart au rythme linéaire, en points de quota (positif = en avance sur la dépense).
export function weekPace(weeks: number[], now: number) {
  const max = weeks.length * 100;
  const total = weeks.reduce((a, b) => a + b, 0);
  const elapsed = weekElapsed(now);
  return { total, max, elapsed, delta: Math.round(total - elapsed * max) };
}
