const SECOND = 1000;
const MINUTE = 60 * SECOND;

const UNITS = [
  [/^(jours?|days?|j|d)$/i, 24 * 60 * MINUTE],
  [/^(heures?|hours?|hrs?|h)$/i, 60 * MINUTE],
  [/^(minutes?|mins?|m)$/i, MINUTE],
  [/^(secondes?|seconds?|secs?|s)$/i, SECOND],
];

// Lit dans la réponse d'un bot de bump le temps à attendre avant le prochain bump, en ms
// (null si la réponse n'en annonce pas). Gère, dans cet ordre :
// - les timestamps Discord : "<t:1760000000:R>"
// - les durées en toutes lettres : "37 minutes", "23 heures et 5 min", "1h 30m", "45s"
// - les chronos : "01:59:30"
// Renvoie aussi la marge à ajouter : une durée en minutes est arrondie par le bot, pas un timestamp.
function parseWait(text, now = Date.now()) {
  const stamp = text.match(/<t:(\d+)(?::[a-zA-Z])?>/);
  if (stamp) {
    const waitMs = Number(stamp[1]) * SECOND - now;
    if (waitMs > 0) return { waitMs, marginMs: 10 * SECOND };
  }

  let waitMs = 0;
  let smallest = Infinity;
  // Une unité = toute la suite de lettres qui suit le nombre : "2 members" ou "5 bumps" sont ignorés.
  for (const [, amount, unit] of text.matchAll(/(\d+)\s*([a-zA-Zé]+)/g)) {
    const match = UNITS.find(([pattern]) => pattern.test(unit));
    if (!match) continue;
    waitMs += Number(amount) * match[1];
    smallest = Math.min(smallest, match[1]);
  }
  if (waitMs > 0) return { waitMs, marginMs: Math.min(Math.max(smallest, 10 * SECOND), MINUTE) };

  const clock = text.match(/\b(\d{1,2}):(\d{2}):(\d{2})\b/);
  if (clock) {
    const [h, m, s] = clock.slice(1).map(Number);
    waitMs = (h * 3600 + m * 60 + s) * SECOND;
    if (waitMs > 0) return { waitMs, marginMs: 10 * SECOND };
  }
  return null;
}

module.exports = { parseWait, MINUTE };
