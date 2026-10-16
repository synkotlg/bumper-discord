---
name: verifier
description: Vérifie une modification de bumper-discord avant commit (syntaxe, tests du parseur de délais, démarrage à blanc). À utiliser après toute modif de index.js, cooldown.js ou config.
---

# Vérifier bumper-discord

1. `npm ci` si `node_modules/` manque.
2. `node --check index.js && node --check cooldown.js`
3. `npm test` : tous les tests de `cooldown.test.js` doivent passer. Nouveau format de réponse d'un bot
   de bump (autre langue, autre unité) = ajouter un cas dans `cooldown.test.js`.
4. Démarrage à blanc sans vrai token, dans un dossier temporaire (ne pas toucher au `config.json` du
   dépôt) : copier `index.js` et `cooldown.js`, lier `node_modules`, écrire un `config.json` avec
   `{"bumps":[{"name":"Test","guildId":"1","channelId":"2"}]}`, puis `DISCORD_TOKEN=faux node index.js`.
   Résultat attendu : `ERREUR : connexion impossible (An invalid token was provided.)`, rien d'autre.
5. Si une clé de config change, mettre à jour le tableau `config.json` du README.
