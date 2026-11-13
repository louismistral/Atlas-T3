# ATLAS.md : le fork Atlas-T3

Ce dépôt est **Atlas-T3**, le fork personnel de Louis de [T3 Code](https://github.com/pingdotgg/t3code) (`upstream`). But : ajouter ses fonctions (Atlas) **et** continuer à recevoir chaque version de T3. Ce fichier fait foi pour toute session, Claude ou Codex, d'où qu'elle vienne. Louis ne fait pas de git lui-même : c'est à toi de suivre ces règles sans qu'il les rappelle.

## Les branches

- `main` (sur `origin` = github.com/louismistral/Atlas-T3) = T3 + nos modifications. C'est la seule branche qui compte ; le raccourci « ATLAS T3 » la lance.
- `upstream` = T3 lui-même ; on n'y pousse jamais.
- On ne réécrit jamais `main` (pas de rebase de `main`, pas de `push --force` sur `main`). Les mises à jour de T3 entrent par **fusion** : plusieurs sessions travaillent en parallèle, une réécriture ferait perdre leur travail.
- `atlas/base-t3.txt` : la version de T3 sur laquelle repose `main` (mise à jour par la fusion).

## Avant de construire une fonction

1. **T3 l'a-t-il déjà ?** Chercher dans `docs/user/`, les réglages (`packages/contracts/src/settings.ts`) et l'app. Exemples déjà trouvés : liste de tâches de Claude avec `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` (variable de l'instance Claude), affichage des appels d'outils `toolCallVisibility` (`showAll`, `hideSuccessful`, `hideAll`, `zen`), plusieurs comptes = plusieurs instances, renvoi à la réinitialisation d'une limite. Si oui : le régler, le noter dans le registre (statut « réglage T3 »), ne rien coder.
2. **Peut-elle vivre hors du fork ?** Un serveur MCP chargé par les agents, un programme à côté qui lit les fichiers : zéro conflit avec T3. À préférer quand l'interface de T3 n'a pas besoin de changer.
3. Sinon, dans le fork, en suivant les règles ci-dessous. Donner un identifiant `Ax` (prochain libre du registre) et ajouter sa ligne au registre **avant** de coder.

## Où et comment écrire le code

- **Notre code dans nos dossiers `atlas/`** : `apps/server/src/atlas/`, `apps/web/src/atlas/`, `packages/contracts/src/atlas/`, etc. Outils pour les agents : un dossier à nous dans `apps/server/src/mcp/toolkits/atlas*/`.
- **Dans les fichiers de T3, le moins possible** : un import et un appel, placés en fin de liste ou de bloc, jamais au milieu. Chaque ligne touchée porte `// [Atlas] Ax : pourquoi` (en JSX : `{/* [Atlas] Ax : pourquoi */}`). Pour changer un composant de T3, l'envelopper ou le remplacer depuis notre dossier plutôt que réécrire son contenu.
- **Désactiver plutôt que supprimer** du code de T3 (une condition marquée), pour que leurs modifications futures ne butent pas sur un trou.
- Un élément d'interface ajouté porte `data-atlas="Ax"` (repère pour les tests et les captures).
- **Pas de nouvelle dépendance** sans la noter dans le registre ; ne jamais commiter `pnpm-lock.yaml` sinon (`git checkout -- pnpm-lock.yaml` après `vp i`).
- Chaque fonction a un test dans un dossier `atlas/` (`*.test.ts`), qui échoue si la fonction disparaît. C'est lui qui protège la fonction lors des mises à jour de T3.

## Faire une modification (n'importe quelle session)

1. Partir de `main` à jour : `git pull` dans le checkout principal (`C:\Users\lloui\Documents\Claude\Code - Atlas T3`).
2. Travailler dans un **worktree** à soi, branche `atlas/Ax-nom` : `git worktree add ../atlas-t3-wt/Ax-nom -b atlas/Ax-nom main`. Deux sessions ne touchent jamais le même checkout ; le registre dit quels fichiers chaque fonction touche, vérifier qu'une autre fonction en cours ne les touche pas.
3. Coder, mettre à jour la ligne du registre (fichiers de T3 touchés, ce qui est enlevé ou désactivé, comment vérifier, statut).
4. `bash atlas/verifier.sh` doit passer.
5. Intégrer **un commit par fonction** : `git switch main && git pull && git merge --squash atlas/Ax-nom && git commit -m "Ax : <fonction> — <pourquoi>"`, revérifier si `main` avait bougé, `git push origin main`, puis supprimer le worktree et la branche. Une retouche ultérieure = un commit « Ax : … » de plus, pas une nouvelle fonction.
6. Ajouter au panneau d'aide / à la doc utilisateur si la fonction se voit (`docs/user/`, marqué).

## Mettre à jour depuis T3

- `bash atlas/maj-depuis-t3.sh` : prend la dernière version **stable** de T3 (tag `vX.Y.Z`, pas les nightly), pose un tag de sauvegarde `atlas-avant-maj-…`, fusionne, vérifie, pousse. Si rien de neuf : « Déjà à jour ».
- En cas de conflit (code 2) : pour chaque fichier, lire le marqueur `[Atlas] Ax` et sa ligne du registre ; refaire l'intention de la modification sur le nouveau code de T3, pas recopier l'ancien. `git rerere` retient chaque résolution. Puis `bash atlas/maj-depuis-t3.sh --finir`.
- Si une vérification échoue : corriger dans la foulée, ou revenir en arrière et le dire à Louis.
- Rythme : une tâche planifiée le lance chaque semaine ; une session peut aussi le lancer quand Louis le demande.

## Revenir en arrière

Après une mise à jour ratée : `git reset --hard atlas-avant-maj-<date>` puis `git push --force-with-lease origin main` (seul cas permis de réécriture, juste après la mise à jour, aucune autre session n'ayant poussé entre-temps). Le dire à Louis.

## Registre

Statuts : `prévu`, `en cours`, `en place`, `réglage T3` (T3 le fait déjà), `hors fork`, `abandonné`. Les identifiants A1 à A14 reprennent `docs/couche-atlas.md` du projet Atlas (`C:\Users\lloui\Documents\Claude\Code - Atlas`), qui détaille le besoin et ce que T3 a déjà.

| Id  | Fonction                                                                                               | Pourquoi                                                          | Fichiers de T3 touchés                                      | Enlevé / désactivé       | Comment vérifier                                | Statut     |
| --- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------ | ----------------------------------------------- | ---------- |
| A0  | Outillage du fork : ce fichier, `atlas/` (lanceur, mise à jour, vérifications), ligne dans `AGENTS.md` | garder T3 à jour sous nos modifications, pour toutes les sessions | `AGENTS.md` (dernière ligne)                                | rien                     | `bash atlas/verifier.sh` passe                  | en place   |
| A1  | Plusieurs comptes Claude                                                                               | travailler sur EPFL et perso                                      | —                                                           | —                        | deux instances Claude dans Réglages › Providers | réglage T3 |
| A2  | Passer sur l'autre compte et renvoyer à une limite                                                     | ne jamais être bloqué                                             | à définir                                                   | rien                     | —                                               | prévu      |
| A3  | Quotas côte à côte                                                                                     | voir où on en est                                                 | —                                                           | —                        | page Usage › Limits                             | réglage T3 |
| A4  | Barre du cache (chaud / froid), tokens et $ par tour                                                   | savoir quand le cache expire                                      | à définir                                                   | rien                     | —                                               | prévu      |
| A5  | Journal de consommation (liste des tours, anomalies, export)                                           | savoir ce qui consomme                                            | à définir                                                   | rien                     | —                                               | prévu      |
| A6  | Sessions qui viennent chercher Louis (états, colonnes, raccourcis lu / non lu)                         | aucune session n'attend sans qu'il le voie                        | à définir                                                   | rien                     | —                                               | prévu      |
| A8  | Lien avec le Desktop (fiches, titres, épingles)                                                        | une seule vérité avec Claude Desktop                              | à définir                                                   | rien                     | —                                               | prévu      |
| A9  | Chercher et lire les conversations hors T3                                                             | retrouver une conversation partout                                | à définir                                                   | rien                     | —                                               | prévu      |
| A10 | Saisie : collage HTML → Markdown, mode `!`                                                             | confort de saisie                                                 | à définir                                                   | rien                     | —                                               | prévu      |
| A11 | Lecture d'un tour : une ligne par appel, durée sous la réponse, affichage détaillé global              | lire un tour d'un coup d'œil                                      | à définir (essayer d'abord `toolCallVisibility`)            | rien                     | —                                               | prévu      |
| A13 | Panneau Aide (Ctrl+/)                                                                                  | retrouver chaque fonction                                         | à définir                                                   | rien                     | —                                               | prévu      |
| A15 | Liste de tâches et bilan de fin à boutons (`update_plan`, `wrap_up`) pour l'agent                      | suivre une session sans la lire                                   | à définir (essayer d'abord `CLAUDE_CODE_ENABLE_TODO_TOOLS`) | rien                     | —                                               | prévu      |
| A16 | Groupes et sections perso dans la barre                                                                | ranger les sessions comme dans le Desktop                         | à définir                                                   | rien                     | —                                               | prévu      |
| A17 | État, activation, reconnexion des connecteurs MCP                                                      | voir si Notion, Gmail… marchent                                   | à définir                                                   | rien                     | —                                               | prévu      |
| A18 | Approuver un plan d'un bouton                                                                          | la carte de plan n'a pas de bouton                                | à définir                                                   | rien                     | —                                               | prévu      |
| A19 | Retour des fichiers hors worktree                                                                      | revenir en arrière partout, comme le Desktop                      | à définir                                                   | rien                     | —                                               | prévu      |
| A20 | Nom « ATLAS T3 » en haut à gauche de la barre                                                          | distinguer ATLAS T3 de T3 ouvert à côté                           | `apps/web/src/components/sidebar/SidebarChrome.tsx`         | texte « Code » désactivé | haut gauche de la barre : ATLAS T3              | en place   |
