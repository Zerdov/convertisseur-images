# Projet A — Générateur de set d'images responsive (Frontend only)

## Contexte global (pour qu'une IA comprenne sans le fil de discussion complet)
Projet construit dans une démarche de recherche d'emploi/stage et de vitrine personnelle d'apprentissage. L'auteur est junior, avec 1-2 projets publics existants sur GitHub, l'objectif étant d'étoffer son portfolio (cible : 4-6 projets solides pour remplir les emplacements "pinned" de GitHub). Stratégie plateforme : GitHub priorisé comme vitrine principale ; les repos GitLab existants sont privés et restent une option secondaire, pas la priorité.

Ce document fait paire avec `specs-projet-B.md` (projet fullstack distinct, à démarrer seulement une fois ce projet-ci terminé et documenté).

## Objectif du projet
Un outil web qui prend une image en entrée et génère automatiquement un set d'images responsive prêt à l'emploi pour le développement web, dans une logique mobile-first.

## Entrée / Sortie
- **Entrée** : une image fournie par l'utilisateur
- **Sortie** :
  - 1 JPEG allégé (image de fallback)
  - 3 variantes WebP : small / medium / large (largeurs fixes pour le v1 — aucune norme officielle sur ces valeurs, seulement des conventions de praticiens ; à documenter explicitement comme choix arbitraire dans le README)
  - Un snippet HTML `<picture>` généré **dynamiquement** à partir des noms de fichiers et largeurs réellement produits (pas un exemple statique générique)

## Choix d'architecture et justifications

### Conversion 100% côté client
- Technique : Canvas API (`canvas.toBlob()` ou `OffscreenCanvas.convertToBlob()`) avec `type: 'image/webp'`
- Justification : confidentialité (aucune image n'est envoyée à un serveur), rapidité, aucun coût d'hébergement backend, différenciateur défendable en entretien
- **Limite connue à documenter** : le support WebP via cette API n'est pas garanti par la spec (seul PNG est obligatoire pour les navigateurs). Une détection de capacité au runtime est nécessaire, avec message explicite en cas d'absence de support — pas un échec silencieux.

### PWA (installable, hors-ligne)
- Manifest + service worker
- Cohérent avec l'axe mobile-first du projet

### Attribut `sizes` — toujours généré explicitement
- Ne jamais omettre l'attribut : un attribut omis équivaut silencieusement à `sizes="100vw"`, ce qui documente mal l'intention pour qui relit le code
- **v1** : un seul choix simple proposé à l'utilisateur avant génération, pas de système de breakpoints multiples
  - "Pleine largeur" → `sizes="100vw"`
  - "Conteneur limité" → un champ numérique (largeur max en px) → `sizes="(max-width: Xpx) 100vw, Xpx"`
- Rappel technique important : `vw` est toujours relatif au **viewport**, jamais automatiquement au conteneur parent — c'est justement pour ça que le choix "conteneur limité" doit être une saisie explicite de l'utilisateur, l'outil ne peut pas le déduire.

### Accessibilité — retirée du scope
- Le champ "alt text obligatoire" a été retiré des objectifs du projet
- Le markup généré contient tout de même `alt=""` (attribut requis par la norme HTML, même vide) — à compléter par le développeur qui utilise l'outil, à mentionner honnêtement dans le README plutôt que présenté comme une fonctionnalité d'accessibilité

### Performance / SEO
- Réduction du poids des fichiers + attributs `width`/`height` sur l'`<img>` pour limiter le Cumulative Layout Shift (CLS)
- CLS fait partie des Core Web Vitals, utilisés par Google comme un signal parmi d'autres dans ses systèmes de classement — à formuler avec cette nuance dans le README (pas une promesse de meilleur classement)

## Roadmap
- **v1** : image unique → 3 WebP (largeurs fixes) + JPEG fallback + snippet `<picture>` avec choix simple pour `sizes`
- **v2** : traitement par lot d'images (Web Workers pour ne pas bloquer l'UI pendant l'encodage), seuils de tailles rendus configurables
- **v3** : PWA complète (installable, fonctionnement hors-ligne)

## Hors scope (explicitement)
- Accessibilité comme axe dédié (retiré)
- Traitement serveur pour gros volumes (déplacé vers le projet B)
- Système de breakpoints multiples pour `sizes` (au-delà du choix simple du v1)

## CI/CD & hébergement
- GitHub Actions : lint + build + déploiement automatique sur GitHub Pages à chaque push sur la branche par défaut (actions officielles `actions/upload-pages-artifact` + `actions/deploy-pages`)
- GitHub Pages étant un hébergement de sites **statiques uniquement**, ce projet reste volontairement 100% front-end pour rester compatible avec cet hébergement

## Contenu attendu du README
- Pourquoi le choix 100% client-side
- Limites connues (support WebP non garanti, hypothèse sur `sizes`, tailles small/medium/large = convention non standard)
- Section transparente sur l'usage de l'IA pendant le développement (ce qui a été assisté par IA, ce qui a été compris/fait manuellement, difficultés rencontrées) — pensée comme un signal de discernement pour un recruteur, pas une faiblesse à masquer