# bumper-discord

Self-bot Discord (Node.js, `discord.js-selfbot-v13`) qui envoie `/bump` (DISBOARD par défaut) en boucle sur des serveurs, dès que le cooldown est fini. Cible : Windows, lancé en arrière-plan sans fenêtre.

## Fichiers

- `index.js` : tout le bot. Charge `.env` (`DISCORD_TOKEN`) et `config.json`, planifie un bump par serveur, lit la réponse de DISBOARD (attend l'édition du message différé) et se recale sur le cooldown annoncé (« X minutes » -> X + 1 min).
- `config.json` : `intervalMinutes`, `jitterMinutes`, `retryMinutes`, `bumps[]` (`name`, `guildId`, `channelId`, optionnels `botId` / `command`).
- `bot.ps1` : pilotage Windows (`start`, `stop`, `status`, `logs`, `autostart-on`, `autostart-off`) via `conhost --headless` et un PID dans `bump.pid`.
- `*.cmd` : raccourcis double-clic vers `bot.ps1`.
- `bump.log`, `bump.pid`, `.env` : générés localement, ignorés par git.

## Commandes

- `npm install`
- `npm start` : lance le bot dans la console (debug).
- Pas de tests ni de lint configurés.

## Règles

- Ne jamais committer `.env` ni un vrai token ; `config.json` versionné ne contient que des placeholders (`ID_DU_SERVEUR`, `ID_DU_SALON`).
- Le dépôt est public : garder les exemples génériques, aucun ID réel.
- Code, logs et messages utilisateur en français ; `bot.ps1` sans accents (encodage PowerShell).
- Node >= 20.18 (utilise `process.loadEnvFile` et `fetch` natifs), CommonJS.
- Pas d'emoji dans le code, les logs ou la doc.
