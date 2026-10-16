const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('discord.js-selfbot-v13');

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // pas de .env : on se rabat sur les variables d'environnement du système
}

const DISBOARD_ID = '302050872383242240';
const MINUTE = 60_000;
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
const jitterMs = (config.jitterMinutes ?? 3) * MINUTE;
const retryMs = (config.retryMinutes ?? 10) * MINUTE;

const token = process.env.DISCORD_TOKEN;
if (!token) fatal('DISCORD_TOKEN manquant : copie .env.example en .env et mets ton token dedans.');

const targets = (config.bumps ?? []).filter(t => /^\d+$/.test(t.guildId) && /^\d+$/.test(t.channelId));
if (targets.length === 0) {
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

// Renvoie le délai avant le prochain bump.
async function bump(target) {
  const name = target.name ?? target.guildId;
  const channel = await client.channels.fetch(target.channelId);
  if (channel?.guildId !== target.guildId) {
    throw new Error(`le salon ${target.channelId} n'appartient pas au serveur ${target.guildId}`);
  }

  const reply = await channel.sendSlash(target.botId ?? DISBOARD_ID, target.command ?? 'bump');
  const text = reply ? await waitForReply(reply) : '';
  log(`[${name}] réponse : ${text || '(aucune)'}`);

  // "Please wait another 37 minutes" / "Veuillez patienter encore 37 minutes"
  const cooldown = text.match(/(\d+)\s*minutes?/i);
  if (cooldown) {
    const waitMs = (Number(cooldown[1]) + 1) * MINUTE;
    log(`[${name}] encore en cooldown, nouvel essai dans ${Math.round(waitMs / MINUTE)} min`);
    return waitMs;
  }
  return intervalMs + Math.random() * jitterMs;
}

function schedule(target, delayMs) {
  const name = target.name ?? target.guildId;
  setTimeout(async () => {
    let nextMs;
    try {
      nextMs = await bump(target);
    } catch (err) {
      log(`[${name}] échec du bump : ${err.message}`);
      nextMs = retryMs;
    }
    log(`[${name}] prochain bump vers ${new Date(Date.now() + nextMs).toLocaleTimeString('fr-FR')}`);
    schedule(target, nextMs);
  }, delayMs);
}

client.once('ready', () => {
  log(`Connecté en tant que ${client.user.tag}, ${targets.length} serveur(s) à bumper`);
  // On décale les serveurs de 15 s pour ne pas tout envoyer d'un coup.
  targets.forEach((target, i) => schedule(target, i * 15_000));
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
