# Générateur de set d'images responsive — Design (v1)

Fait paire avec `SPEC.md` (contexte projet, objectifs, roadmap, hors-scope). Ce document couvre les décisions techniques d'implémentation pour le v1.

## Contexte de la décision de stack

Projet portfolio (recherche d'emploi/stage junior), premier projet front-end de l'auteur (pas de React ni d'autre framework dans les projets GitHub existants). Le SPEC impose : 100% client-side, hébergement GitHub Pages (statique uniquement).

**Décision : TypeScript + Vite, sans framework UI.**

Raisons :
- Cohérent avec la philosophie du SPEC (zéro dépendance superflue, argumentaire "pas de backend, tout tourne dans le navigateur")
- Pour un premier projet front-end, démontre la maîtrise du DOM et des API web natives (Canvas, plus tard Web Workers/Service Worker) avant de s'appuyer sur un framework — argument défendable en entretien junior
- L'outil n'a pas d'état applicatif complexe (un fichier image, un choix de sizes, un résultat) : un framework comme React ajouterait du boilerplate sans bénéfice réel (YAGNI)
- TypeScript est conservé pour montrer une compétence de typage/tooling moderne

Compromis assumé : aucun projet du portfolio ne démontre React pour l'instant. Décision : garder React pour un futur projet (candidat naturel : le Projet B fullstack, ou un 3e projet dédié) où un état applicatif réel justifierait le framework.

CSS natif (variables CSS, flexbox/grid) — pas de préprocesseur ni de framework CSS, même logique de minimalisme.

Tests : Vitest, réservé à la logique métier pure (pas de tests e2e en v1 — hors scope, YAGNI pour un portfolio).

## Architecture / structure de projet

```
convertisseur-images/
├── src/
│   ├── main.ts                # point d'entrée, orchestration UI
│   ├── ui/
│   │   ├── dropzone.ts         # gestion de l'input image (drag&drop + file picker)
│   │   ├── sizesSelector.ts    # choix "pleine largeur" / "conteneur limité"
│   │   └── resultView.ts       # affichage des images générées + snippet
│   ├── core/
│   │   ├── imageProcessor.ts   # Canvas API : redimensionnement + toBlob (WebP/JPEG)
│   │   ├── webpSupport.ts      # détection de capacité WebP au runtime
│   │   └── snippetGenerator.ts # génère le <picture> dynamiquement
│   └── styles/
│       └── main.css
├── tests/
│   ├── imageProcessor.test.ts
│   ├── webpSupport.test.ts
│   └── snippetGenerator.test.ts
├── .github/workflows/deploy.yml
├── index.html
├── vite.config.ts
└── README.md
```

Chaque module `core/` a une responsabilité unique et testable indépendamment de l'UI :
- `imageProcessor.ts` : entrée = `File` + config de tailles → sortie = blobs WebP/JPEG. Ne connaît rien du DOM en dehors du `<canvas>` interne qu'il crée.
- `webpSupport.ts` : entrée = rien → sortie = booléen de capacité. Isolé pour être mockable en test.
- `snippetGenerator.ts` : entrée = noms de fichiers + largeurs + choix `sizes` → sortie = string HTML. Fonction pure, aucun effet de bord.

Les modules `ui/` orchestrent le DOM et appellent les modules `core/` ; ils ne contiennent pas de logique de conversion.

## Flux de données (v1)

1. Utilisateur dépose/sélectionne une image → `dropzone.ts` lit le `File`
2. `webpSupport.ts` vérifie le support WebP au chargement de la page (une seule fois, pas à chaque conversion) ; si absent, message explicite qui bloque la génération WebP (jamais d'échec silencieux)
3. Utilisateur choisit "pleine largeur" ou "conteneur limité" (+ largeur max en px) → `sizesSelector.ts`
4. Clic "Générer" → `imageProcessor.ts` dessine l'image sur un `<canvas>` et génère systématiquement le JPEG (destiné à l'`<img>` de secours du `<picture>`) ; les 3 variantes WebP (small/medium/large) ne sont générées que si `webpSupport.ts` a détecté le support d'encodage
5. `snippetGenerator.ts` construit le HTML `<picture>` à partir des noms de fichiers et largeurs réellement produits + l'attribut `sizes` choisi (jamais de valeur codée en dur ou omise)
6. `resultView.ts` affiche les 4 fichiers (téléchargeables) + le snippet (copiable)

## Gestion d'erreurs

- Le JPEG est **toujours généré, sans condition** — ce n'est pas un fallback pour l'outil lui-même, mais la sortie destinée à l'`<img>` de secours dans le `<picture>` du développeur qui utilise l'outil (visiteurs de son site sans support WebP). Le terme "fallback" dans le SPEC désigne cet usage-là, pas un plan B interne à l'outil.
- Pas de support d'encodage WebP dans le navigateur de l'utilisateur de l'outil → message explicite ; seul le JPEG est produit (les 3 variantes WebP ne le sont pas). Dégradation partielle assumée et annoncée, jamais un blocage total ni un échec silencieux.
- Fichier non-image ou trop volumineux → validation à l'entrée avec message utilisateur clair, avant tout traitement Canvas
- Échec de `canvas.toBlob()` (cas rare : mémoire, format) → message d'erreur affiché, jamais de crash silencieux ni de promesse qui reste en attente indéfiniment

## Tests (Vitest)

- `imageProcessor` : vérifie les dimensions de sortie pour des tailles d'entrée variées (image plus petite que small, plus grande que large, etc.)
- `webpSupport` : mock de `canvas.toBlob` pour simuler support/non-support
- `snippetGenerator` : vérifie que le `<picture>` généré correspond exactement aux fichiers/largeurs/`sizes` fournis en entrée (test de non-régression sur le caractère dynamique du snippet)

## CI/CD

Repris tel quel du SPEC.md : GitHub Actions (lint + build + tests) → déploiement automatique sur GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages` à chaque push sur la branche par défaut.

## Hors scope (v1)

Repris du SPEC.md : accessibilité comme axe dédié, traitement serveur, breakpoints `sizes` multiples, traitement par lot (Web Workers → v2), PWA complète (→ v3).
