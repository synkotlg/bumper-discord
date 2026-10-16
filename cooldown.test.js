const test = require('node:test');
const assert = require('node:assert');
const { parseWait, MINUTE } = require('./cooldown');

const wait = text => parseWait(text)?.waitMs ?? null;

test('DISBOARD en anglais et en français', () => {
  assert.strictEqual(wait('Please wait another 37 minutes until the server can be bumped'), 37 * MINUTE);
  assert.strictEqual(wait('Veuillez patienter encore 1 minute avant de pouvoir bumper'), MINUTE);
});

test('durées composées', () => {
  assert.strictEqual(wait('You can bump again in 23 hours and 5 minutes'), (23 * 60 + 5) * MINUTE);
  assert.strictEqual(wait('Réessaie dans 1h30m'), 90 * MINUTE);
  assert.strictEqual(wait('Cooldown : 2 jours'), 2 * 24 * 60 * MINUTE);
  assert.strictEqual(wait('Slow down, 45s left'), 45_000);
});

test('timestamp Discord et chrono', () => {
  const now = 1_760_000_000_000;
  assert.strictEqual(parseWait('Next bump <t:1760003600:R>', now).waitMs, 3600_000);
  assert.strictEqual(wait('Next bump in 01:59:30'), (2 * 60 * 60 - 30) * 1000);
});

test('pas de délai dans une confirmation de bump', () => {
  assert.strictEqual(wait('Bump done! :thumbsup: Check it out on DISBOARD: https://disboard.org/server/123456789012345678'), null);
  assert.strictEqual(wait('Server bumped! 1250 members, 5 bumps today'), null);
  assert.strictEqual(wait(''), null);
});

test('marge : 1 min si le bot arrondit à la minute, 10 s sinon', () => {
  assert.strictEqual(parseWait('wait 37 minutes').marginMs, MINUTE);
  assert.strictEqual(parseWait('wait 23 hours').marginMs, MINUTE);
  assert.strictEqual(parseWait('wait 3 seconds').marginMs, 10_000);
});
