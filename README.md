# bumper-discord

Envoie `/bump` sur tes serveurs, en boucle, dès que le cooldown est fini, sur **tous** les bots de bump
présents (DISBOARD, Discadia, Disurl...) pour amener un maximum de monde.

> Attention : self-bot = contraire aux CGU de Discord et au règlement de DISBOARD. Risque de ban du compte
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

## Ce que fait le bot

- Au lancement puis toutes les 6 h, il cherche sur le serveur tous les bots qui ont une commande `/bump`
  (DISBOARD, Discadia, Disurl, ...) et les bumpe chacun dans sa propre boucle. Un bot ajouté au serveur
  est pris en compte tout seul, sans redémarrer.
- Il lit le délai annoncé dans chaque réponse (« 37 minutes », « 23 heures », compte à rebours Discord...)
  et relance pile à la fin du cooldown : aucun créneau perdu.
- Il note le nombre de membres dans `bump.log` toutes les 6 h (`... 1250 membres (+48 depuis le lancement)`)
  pour voir ce que ça rapporte.

## Maximiser les arrivées

1. **Plus d'annuaires = plus de visiteurs.** Inscris le serveur sur plusieurs sites et ajoute leur bot sur
   ton serveur, le bot les bumpera automatiquement :

   | Site | Cooldown du `/bump` |
   | --- | --- |
   | [disboard.org](https://disboard.org) | 2 h, le plus gros trafic |
   | [discadia.com](https://discadia.com) | 24 h en gratuit |
   | [disurl.me](https://disurl.me) | lu dans la réponse du bot |
   | tout autre annuaire avec un bot `/bump` | lu dans la réponse du bot |

   Top.gg classe les serveurs aux votes des membres, pas au bump : rien à automatiser là.
2. **La fiche fait cliquer.** Sur chaque site : tags précis qui décrivent vraiment le serveur, une phrase
   d'accroche qui dit ce qu'on y trouve, la bonne langue, icône et bannière soignées.
3. **L'accueil fait rester.** Salon de bienvenue clair, rôles à choisir, vérification pas trop lourde et
   un serveur qui a l'air vivant : un nouveau qui tombe sur des salons vides repart aussitôt.
4. **Suis les chiffres.** `statut.cmd` montre les dernières lignes du journal, dont l'évolution du nombre
   de membres.

Si un bot répond que le serveur n'est pas inscrit chez lui, inscris-le sur son site ou mets l'ID du bot
dans `ignoreBots`.

## config.json

| Clé | Défaut | Rôle |
| --- | --- | --- |
| `intervalMinutes` | 120 | Délai entre deux bumps DISBOARD réussis (cooldown DISBOARD = 2 h) |
| `otherBotsMinutes` | 60 | Pareil pour les autres bots, quand leur réponse n'annonce pas de délai |
| `jitterMinutes` | 3 | Délai aléatoire ajouté après un bump réussi (0 à N min) |
| `retryMinutes` | 10 | Délai avant de réessayer après une erreur |
| `scanHours` | 6 | Fréquence de recherche des bots de bump et du relevé du nombre de membres |
| `ignoreBots` | `[]` | IDs de bots à ne jamais bumper |
| `bumps[]` | | Un objet par serveur : `name`, `guildId`, `channelId`. Sans `botId`, tous les bots `/bump` du serveur sont bumpés ; avec `botId` (et `command`, `bump` par défaut), seulement celui-là |

Dès qu'un bot répond « attends encore X », le bot se recale automatiquement sur X (+ 1 min de marge si
le délai est arrondi à la minute).

## Développement

`npm test` vérifie la lecture des délais (`cooldown.js`).
