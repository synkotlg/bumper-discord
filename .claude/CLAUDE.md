# bumper-discord

Self-bot Discord (discord.js-selfbot-v13) qui envoie `/bump` en boucle sur tous les bots de bump d'un
serveur (DISBOARD, Discadia, Disurl...) pour maximiser les arrivées. Tourne sous Windows en arrière-plan.

## Fichiers

- `index.js` : connexion, détection des bots `/bump` (index des commandes du serveur), une boucle par
  serveur + bot, relevé du nombre de membres. Tout est journalisé dans `bump.log`.
- `cooldown.js` : `parseWait(texte)` lit le délai annoncé par un bot (minutes, heures, jours, secondes,
  `<t:...>`, `HH:MM:SS`). Testé par `cooldown.test.js`.
- `config.json` : versionné, l'utilisateur y met ses IDs en local. Ne pas changer ses clés ni ses
  valeurs (conflit au `git pull`) : les nouveaux réglages ont un défaut dans le code et sont documentés
  dans le README.
- `bot.ps1` + `*.cmd` : démarrer, arrêter, statut, journal, démarrage auto Windows.

## Conventions

- Tout en français : logs, messages, README, commentaires. Pas d'emoji.
- Node >= 20.18, CommonJS, aucune dépendance en plus de la lib self-bot.
- Vérifier avant de committer : voir le skill `verifier`.
