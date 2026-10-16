# bumper-discord

Envoie `/bump` (DISBOARD par défaut) sur tes serveurs, en boucle, dès que le cooldown est fini.

> ⚠️ Self-bot = contraire aux CGU de Discord et au règlement de DISBOARD. Risque de ban du compte
> et de retrait du serveur de DISBOARD. À utiliser en connaissance de cause, idéalement avec un compte secondaire.

## Installation

```bash
npm install
```

1. Copie `.env.example` en `.env` et mets ton token Discord dans `DISCORD_TOKEN`.
2. Dans `config.json`, mets l'ID du serveur et l'ID du salon (clic droit > Copier l'identifiant, avec le mode développeur activé).
3. Double-clique sur un des fichiers :

| Fichier | Rôle |
| --- | --- |
| `demarrer.cmd` | Lance le bot en arrière-plan, sans fenêtre |
| `arreter.cmd` | Arrête le bot |
| `statut.cmd` | Dit si le bot tourne + affiche les dernières lignes du journal |
| `journal.cmd` | Affiche le journal en direct |
| `demarrage-auto-activer.cmd` | Lance le bot tout seul, sans fenêtre, à chaque démarrage du PC |
| `demarrage-auto-desactiver.cmd` | Retire le lancement au démarrage |

Le démarrage auto passe par un raccourci « Discord auto-bump » dans le dossier Démarrage de Windows
(visible aussi dans Gestionnaire des tâches > Applications de démarrage). Si tu déplaces le dossier du bot,
relance `demarrage-auto-activer.cmd`. Au démarrage, le bot attend qu'Internet soit dispo avant de se connecter.

Le bot ne touche pas à l'appli Discord : il ouvre sa propre connexion, comme si tu étais connecté sur un
autre appareil. Il recopie ton statut (en ligne, ne pas déranger, invisible) sans le modifier.
Tout ce qu'il fait est écrit dans `bump.log`.

Pour le voir tourner dans la console (debug) : `npm start`.

## config.json

| Clé | Défaut | Rôle |
| --- | --- | --- |
| `intervalMinutes` | 120 | Délai entre deux bumps réussis (cooldown DISBOARD = 2 h) |
| `jitterMinutes` | 3 | Délai aléatoire ajouté (0 à N min) |
| `retryMinutes` | 10 | Délai avant de réessayer après une erreur |
| `bumps[]` | | Un objet par serveur : `name`, `guildId`, `channelId`, et optionnellement `botId` / `command` pour un autre bot de bump |

Si DISBOARD répond « attends encore X minutes », le bot se recale automatiquement sur X + 1 min.
