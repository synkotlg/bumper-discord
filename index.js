const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('discord.js-selfbot-v13');
const { parseWait, MINUTE } = require('./cooldown');

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // pas de .env : on se rabat sur les variables d'environnement du système
}

const DISBOARD_ID = '302050872383242240';
const LOG_FILE = path.join(__dirname, 'bump.log');
const PID_FILE = path.join(__dirname, 'bump.pid');

// Lancé en arrière-plan il n'y a pas de console : tout part aussi dans bump.log.
function log(...args) {
  const line = `[${new Date().toLocaleString('fr-FR')}] ${args.join(' ')}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {
    // journal inaccessible : on garde au moins la console
  }
}

function fatal(message) {
  log(`ERREUR : ${message}`);
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (err) {
  fatal(`config.json illisible (${err.message})`);
}
const intervalMs = (config.intervalMinutes ?? 120) * MINUTE;
const otherBotsMs = (config.otherBotsMinutes ?? 60) * MINUTE;
const jitterMs = (config.jitterMinutes ?? 3) * MINUTE;
const retryMs = (config.retryMinutes ?? 10) * MINUTE;
const scanMs = (config.scanHours ?? 6) * 60 * MINUTE;
const ignoredBots = new Set(config.ignoreBots ?? []);

const token = process.env.DISCORD_TOKEN;
if (!token) fatal('DISCORD_TOKEN manquant : copie .env.example en .env et mets ton token dedans.');

const servers = (config.bumps ?? []).filter(s => /^\d+$/.test(s.guildId) && /^\d+$/.test(s.channelId));
if (servers.length === 0) {
  fatal('aucun serveur valide dans config.json (guildId et channelId doivent être des IDs numériques).');
}

fs.writeFileSync(PID_FILE, String(process.pid));
process.on('exit', () => fs.rmSync(PID_FILE, { force: true }));

// La lib recopie ensuite ton vrai statut (en ligne, ne pas déranger, invisible...) depuis tes
// paramètres Discord ; démarrer en invisible évite juste d'apparaître en ligne pendant la connexion.
const client = new Client({ presence: { status: 'invisible', afk: true } });
client.on('error', err => log(`erreur Discord : ${err.message}`));
process.on('unhandledRejection', err => log(`erreur inattendue : ${err?.message ?? err}`));

function messageText(message) {
  const embeds = (message.embeds ?? []).map(e => [e.title, e.description].filter(Boolean).join(' '));
  return [message.content, ...embeds].filter(Boolean).join(' ').trim();
}

// DISBOARD répond souvent en différé ("réfléchit...") puis édite son message :
// on attend l'édition pour connaître le vrai résultat.
function waitForReply(message, timeoutMs = 15_000) {
  const text = messageText(message);
  if (text) return Promise.resolve(text);

  return new Promise(resolve => {
    const onRaw = packet => {
      if (packet.t !== 'MESSAGE_UPDATE' || packet.d?.id !== message.id) return;
      const updated = messageText(packet.d);
      if (!updated) return;
      done(updated);
    };
    const timer = setTimeout(() => done(''), timeoutMs);
    const done = result => {
      clearTimeout(timer);
      client.off('raw', onRaw);
      resolve(result);
    };
    client.on('raw', onRaw);
  });
}

async function fetchChannel(server) {
  const channel = await client.channels.fetch(server.channelId);
  if (channel?.guildId !== server.guildId) {
    throw new Error(`le salon ${server.channelId} n'appartient pas au serveur ${server.guildId}`);
  }
  return channel;
}

const minutes = ms => Math.round(ms / MINUTE);

// Renvoie le délai avant le prochain bump.
async function bump(target) {
  const channel = await fetchChannel(target.server);
  const reply = await channel.sendSlash(target.appId, target.command);
  const text = reply ? await waitForReply(reply) : '';
  log(`[${target.label}] réponse : ${text || '(aucune)'}`);

  // "Please wait another 37 minutes", "Tu pourras rebumper dans 23 heures", "<t:1760000000:R>"... :
  // on se recale pile sur le délai annoncé, que ce soit un refus ou la confirmation du bump.
  const wait = parseWait(text);
  if (wait) {
    log(`[${target.label}] délai annoncé : ${minutes(wait.waitMs)} min`);
    return wait.waitMs + wait.marginMs;
  }
  return target.cooldownMs + Math.random() * jitterMs;
}

// Un bot de bump par serveur = une boucle. Clé : serveur + appli.
const active = new Map();

function schedule(target, delayMs) {
  setTimeout(async () => {
    let nextMs;
    try {
      nextMs = await bump(target);
      target.missing = 0;
    } catch (err) {
      log(`[${target.label}] échec du bump : ${err.message}`);
      // Bot retiré du serveur : on lâche après 3 essais, le prochain scan le reprendra s'il revient.
      if (err.code === 'INVALID_APPLICATION_COMMAND' && target.auto && ++target.missing >= 3) {
        log(`[${target.label}] bot introuvable, abandon`);
        active.delete(target.key);
        return;
      }
      nextMs = retryMs;
    }
    log(`[${target.label}] prochain bump vers ${new Date(Date.now() + nextMs).toLocaleTimeString('fr-FR')}`);
    schedule(target, nextMs);
  }, delayMs);
}

// 15 s entre deux premiers bumps pour ne pas tout envoyer d'un coup.
let lastStartAt = 0;
function start(target) {
  if (active.has(target.key)) return;
  active.set(target.key, target);
  lastStartAt = Math.max(Date.now(), lastStartAt + 15_000);
  log(`[${target.label}] ajouté, bump toutes les ${minutes(target.cooldownMs)} min sauf délai annoncé`);
  schedule(target, lastStartAt - Date.now());
}

function makeTarget(server, app, command, auto) {
  const isDisboard = app.id === DISBOARD_ID || app.bot_id === DISBOARD_ID;
  return {
    key: `${server.guildId}:${app.id}`,
    label: `${server.name ?? server.guildId} / ${app.name}`,
    server,
    appId: app.id,
    command,
    cooldownMs: isDisboard ? intervalMs : otherBotsMs,
    auto,
    missing: 0,
  };
}

// Toutes les applis du serveur qui ont une commande /bump utilisable telle quelle (sans option
// obligatoire ni sous-commande) : DISBOARD, Discadia, Disurl, DiscordServers... DISBOARD en premier.
function findBumpApps(index) {
  const apps = [];
  for (const command of index.application_commands ?? []) {
    if (command.type !== 1 || ![command.name, command.name_default].includes('bump')) continue;
    if (command.options?.some(o => o.required || o.type === 1 || o.type === 2)) continue;
    const app = index.applications?.find(a => a.id === command.application_id);
    if (!app || ignoredBots.has(app.id) || ignoredBots.has(app.bot_id)) continue;
    if (apps.some(a => a.id === app.id)) continue;
    apps.push(app);
  }
  return apps.sort((a, b) => (b.id === DISBOARD_ID) - (a.id === DISBOARD_ID));
}

// Nombre de membres, pour voir l'effet des bumps dans le journal.
const firstCounts = new Map();
async function logMembers(server) {
  const guild = await client.api.guilds(server.guildId).get({ query: { with_counts: true } });
  const count = guild.approximate_member_count;
  if (typeof count !== 'number') return;
  if (!firstCounts.has(server.guildId)) firstCounts.set(server.guildId, count);
  const diff = count - firstCounts.get(server.guildId);
  log(`[${server.name ?? server.guildId}] ${count} membres (${diff >= 0 ? '+' : ''}${diff} depuis le lancement)`);
}

// Recherche les bots de bump du serveur au démarrage puis toutes les scanHours : un bot ajouté
// au serveur (Discadia, Disurl...) est pris en charge sans redémarrer.
async function scan(server) {
  const name = server.name ?? server.guildId;
  let found = 0;
  try {
    const channel = await fetchChannel(server);
    const apps = findBumpApps(await channel.searchInteractionFromGuildAndPrivateChannel());
    found = apps.length;
    if (found === 0) log(`[${name}] aucun bot avec /bump trouvé, nouvel essai dans ${minutes(retryMs)} min`);
    for (const app of apps) start(makeTarget(server, app, 'bump', true));
  } catch (err) {
    log(`[${name}] recherche des bots de bump impossible : ${err.message}`);
  }
  try {
    await logMembers(server);
  } catch (err) {
    log(`[${name}] nombre de membres indisponible : ${err.message}`);
  }
  setTimeout(() => scan(server), found ? scanMs : retryMs);
}

client.once('ready', () => {
  log(`Connecté en tant que ${client.user.tag}, ${servers.length} serveur(s) à bumper`);
  for (const server of servers) {
    // botId renseigné = ce bot-là uniquement, avec sa commande ; sinon détection automatique.
    const command = server.command ?? 'bump';
    if (server.botId) start(makeTarget(server, { id: server.botId, name: command }, command, false));
    else scan(server);
  }
});

// Au démarrage du PC le réseau n'est pas toujours prêt : on attend que Discord réponde avant de se connecter.
async function waitForNetwork() {
  for (;;) {
    try {
      await fetch('https://discord.com/api/v9/gateway');
      return;
    } catch {
      log('pas encore de connexion internet, nouvel essai dans 30 s');
      await new Promise(resolve => setTimeout(resolve, 30_000));
    }
  }
}

waitForNetwork()
  .then(() => client.login(token))
  .catch(err => fatal(`connexion impossible (${err.message})`));
