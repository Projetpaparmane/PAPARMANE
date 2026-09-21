# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Nature du projet

Site vitrine **HTML statique** (template « Redox » personnalisé) + un outil d'audit
SEO livrable aux clients. Pas de framework, pas de `package.json`, **pas d'étape de
build** : Netlify publie la racine telle quelle.

Un ancien README décrivait un projet Astro — c'est faux, le projet a pivoté très tôt.
Ne pas chercher `src/`, `npm run dev` ou des composants : ils n'existent pas.

## Commandes

```bash
node server.js                 # site statique, http://localhost:4321
netlify dev --port 8888        # site + fonction /api/audit (requis pour l'outil SEO)
```

Aucun test, aucun linter, rien à installer. La vérification se fait en lançant le
serveur et en regardant le rendu.

## Architecture

### Les styles sont en deux couches

`assets/css/style.css` (590 Ko) est **généré** depuis `assets/scss/style.scss` — c'est
le template Redox, à ne pas éditer à la main.

`assets/css/paparmane.css` est la couche d'identité, chargée **après**, qui surcharge
le template sans y toucher (accent `#e64015`, logo texte en Fraunces). **C'est là que
vont les retouches de design.**

Il est appelé avec un cache-buster `?v=N`, identique sur les **13 pages** qui le
chargent. Après modification, incrémenter le numéro **partout en même temps** :

```bash
sed -i '' 's/paparmane\.css?v=9/paparmane.css?v=10/' *.html   # macOS
```

Fraunces vient de Google Fonts ; les autres polices sont locales dans `assets/fonts/`.

### L'outil SEO : le client orchestre, la fonction est sans état

`outil-seo.html` est **entièrement autonome** — un seul `<script>`, un seul `<style>`,
zéro asset externe (d'où ses 178 Ko). Il peut être ouvert en `file://` : il bascule
alors sur l'API publiée.

Le partage des rôles est le point important :

- **`netlify/functions/audit.mjs` ne traite qu'une URL par appel** et ne garde aucun
  état entre les appels.
- **`outil-seo.html` pilote tout le crawl** côté navigateur : il parcourt les sitemaps
  un fichier à la fois, puis lance 5 workers parallèles (`CRAWL_WORKERS`) plafonnés à
  1000 pages (`MAX_AUDIT_PAGES`).

Donc : pour changer la *stratégie* de crawl, éditer le HTML ; pour changer l'*analyse*
d'une page, éditer la fonction.

La route `/api/audit` est déclarée **dans la fonction** (`export const config`, API
Netlify Functions v2). Ne pas ajouter de redirection dans `netlify.toml`.

### Les sept modes de la fonction

| Mode | Rôle | Code d'accès |
|---|---|---|
| `auth` | valide le code d'accès de la page | — |
| `discover` | robots.txt, sitemap, llms.txt, robots d'IA | non |
| `sitemap` | lit un fichier sitemap | non |
| `page` | analyse complète d'une page | non |
| `verify` | `POST urls[]` — statut et redirections | non |
| `traffic` | intelligence trafic (DataForSEO) | **requis** |
| `gap` | écart de mots-clés vs concurrent (DataForSEO) | **requis** |

Variables d'environnement : `PAPARMANE_ACCESS_KEY`, `DATAFORSEO_LOGIN`,
`DATAFORSEO_PASSWORD`.

**À savoir sur le code d'accès :** il ne protège réellement que `traffic` et `gap`.
Les modes `discover`, `sitemap`, `page` et `verify` répondent sans vérifier la clé — la
porte de `outil-seo.html` est une commodité d'interface, pas une sécurité. Et tant que
`PAPARMANE_ACCESS_KEY` n'est pas défini sur Netlify, `auth` accepte le mot codé en dur
`"paparmane"` (repli marqué « compatibilité temporaire » dans le code).

Le moteur connaît une trentaine de robots d'IA et énonce, pour chacun, la conséquence
concrète d'un blocage — c'est le cœur du livrable client, à garder factuel et vérifié.

### Assets morts

`assets/ad-imgs/`, `assets/ad-js/`, `assets/ad-scss/` et `assets/css/ad-style.css`
viennent d'une autre déclinaison du template. **Aucune page ne les charge** (151
fichiers, dont un `Three.js` de 685 Ko). Ne pas s'en servir comme référence ; ils
peuvent être supprimés.

## Conventions

Messages de commit en **français, à l'infinitif, sans accents** dans le sujet
(« Corriger les faux positifs du score SEO », « Fiabiliser les audits et les rapports
clients »). Les guillemets français « » sont utilisés dans le texte.

Les commentaires du code sont en français et expliquent le *pourquoi* d'une décision
(seuils, garde-fous, correctifs). Les conserver à jour : plusieurs commentaires
d'en-tête ont déjà divergé du code qu'ils décrivent.

L'interlocutrice est **designer graphique / conceptrice web** : privilégier les
explications en termes de rendu et de design plutôt que de plomberie technique.
**Ne pas faire de captures d'écran.**
