# Générateur de set d'images responsive

Outil web qui prend une image en entrée et génère automatiquement, **entièrement dans le navigateur**, un set d'images prêt à l'emploi pour le développement web responsive et mobile-first :

- 3 variantes WebP : small / medium / large (480 / 768 / 1200 px)
- 1 JPEG allégé (image de secours)
- Un snippet HTML `<picture>` généré **dynamiquement** à partir des fichiers et largeurs réellement produits

## Pourquoi 100% côté client ?

Aucune image n'est envoyée à un serveur : tout le traitement (redimensionnement, encodage WebP/JPEG) passe par l'API Canvas du navigateur (`canvas.toBlob()`). Deux raisons à ce choix :

- **Confidentialité** : les images de l'utilisateur ne quittent jamais son navigateur.
- **Contrainte d'hébergement** : le site est déployé sur GitHub Pages, qui n'héberge que du contenu statique — un backend n'est donc pas une option ici.

## Limites connues

- **Support WebP non garanti** : la spécification `canvas.toBlob()` garantit uniquement l'encodage PNG ; le support de l'encodage WebP dépend du navigateur. L'outil détecte cette capacité au chargement de la page. Si elle est absente, un message explicite est affiché et seul le JPEG de secours est généré (jamais d'échec silencieux).
- **Largeurs small/medium/large (480/768/1200 px)** : ce ne sont pas des valeurs standardisées, seulement une convention courante chez les développeurs front-end. Choix arbitraire assumé pour ce v1.
- **Attribut `sizes`** : le v1 ne propose qu'un choix simple ("pleine largeur" ou "conteneur limité" avec une largeur max) plutôt qu'un système de breakpoints multiples. `vw` est toujours relatif au viewport, jamais au conteneur parent — c'est pourquoi "conteneur limité" nécessite une saisie explicite de l'utilisateur.
- **`alt=""`** : le markup généré inclut un attribut `alt` vide parce qu'il est requis par la norme HTML, pas parce que ce projet traite l'accessibilité comme une fonctionnalité — à compléter par le développeur qui utilise l'outil.
- **Taille de fichier max (15 Mo)** : limite arbitraire côté validation d'entrée, pour éviter de bloquer le navigateur sur un fichier démesuré.

## Utilisation

1. Déposez ou sélectionnez une image.
2. Choisissez le mode `sizes` ("pleine largeur" ou "conteneur limité" + largeur max).
3. Cliquez sur "Générer".
4. Téléchargez les fichiers produits et copiez le snippet `<picture>` généré.

## Développement

```bash
npm install
npm run dev      # serveur de développement
npm test         # tests Vitest (logique métier pure, dossier core/)
npm run lint     # ESLint
npm run build    # build de production dans dist/
```

## Stack

TypeScript + Vite, sans framework UI (choix volontaire pour ce premier projet front-end : démontrer la maîtrise du DOM et des API natives — Canvas ici, Web Workers/Service Worker dans les évolutions futures — avant de s'appuyer sur un framework). CSS natif (pas de préprocesseur). Tests unitaires avec Vitest, limités à la logique métier pure du dossier `core/`.

## Roadmap

- **v2** : traitement par lot (Web Workers), seuils de tailles configurables.
- **v3** : PWA complète (installable, hors-ligne).

## Usage de l'IA pendant le développement

_À compléter avant publication : préciser ce qui a été assisté par IA (scaffolding, structure des modules, tests), ce qui a été compris et ajusté manuellement, et les difficultés rencontrées. Section pensée comme un signal de discernement, pas une faiblesse à masquer._
