# PAPARMANE

Site vitrine de l'agence — **HTML statique**, sans étape de build, déployé sur Netlify.
Basé sur le template « Redox », avec une couche d'identité Paparmane par-dessus.

Inclut aussi **l'outil d'audit SEO** (`outil-seo.html` + une fonction Netlify),
un livrable client autonome.

## Stack

- **HTML statique** — une page = un fichier `.html` à la racine, aucun framework
- **SCSS** compilé vers `assets/css/style.css` (le `.map` est versionné)
- **GSAP + ScrollTrigger / ScrollSmoother**, Swiper, Bootstrap, jQuery — via `assets/vendor/`
- **Fonction Netlify** (`netlify/functions/audit.mjs`) pour le moteur d'audit SEO
- Pas de `package.json` : aucune dépendance npm à installer

## Développement local

```bash
node server.js        # sert le site sur http://localhost:4321
```

Serveur statique minimal, suffisant pour toutes les pages **sauf** l'outil SEO :
celui-ci a besoin de la fonction Netlify.

```bash
netlify dev           # site + fonction /api/audit
```

Ouvert en `file://`, `outil-seo.html` bascule automatiquement sur l'API publiée
(`https://paparmane.netlify.app/api/audit`) — pratique pour tester sans rien lancer.

### Modifier les styles

`assets/css/style.css` est **généré** depuis `assets/scss/style.scss`.
Pour les retouches d'identité (couleurs, logo, typo de marque), éditer plutôt
`assets/css/paparmane.css` : il est chargé **après** `style.css` et surcharge le
template sans toucher à son cœur. Son `?v=` dans les pages sert de cache-buster —
l'incrémenter après une modification.

## Structure

```
*.html                      14 pages à la racine (index, about, services,
                            portfolio, blog, team, contact, faq, 404…)
outil-seo.html              outil d'audit SEO — autonome, aucun asset externe

assets/
  css/style.css             template Redox compilé (+ .map)
  css/paparmane.css         couche d'identité Paparmane (accent #e64015, logo)
  scss/                     sources SCSS : utils/, components/, pages/
  js/main.js                script principal du site
  js/magiccursor.js         curseur personnalisé
  vendor/                   librairies (GSAP, Swiper, Bootstrap, jQuery, Matter.js…)
  imgs/                     images du site
  fonts/ webfonts/          polices locales (BDO Grotesk, PP Editorial New,
                            Beatrice, Astro Nebula…)
                            Fraunces (logo) vient de Google Fonts, pas d'ici

netlify/functions/audit.mjs moteur d'audit SEO
netlify.toml                publication + en-têtes de cache
server.js                   serveur statique local (port 4321)
```

### Assets non utilisés

`assets/ad-imgs/`, `assets/ad-js/`, `assets/ad-scss/` et `assets/css/ad-style.css`
viennent d'une autre déclinaison du template : **aucune page du site ne les charge**
(~150 fichiers, dont un `Three.js` de 685 Ko). Ils peuvent être supprimés.

## L'outil SEO

`outil-seo.html` est une page autonome (tout en inline) qui pilote
`netlify/functions/audit.mjs` via `/api/audit`. La route est déclarée dans la
fonction elle-même (`export const config = { path: "/api/audit" }`, API Netlify
Functions v2) — il n'y a donc **pas** de redirection à ajouter dans `netlify.toml`.

Sept modes :

| Mode | Appel | Rôle |
|---|---|---|
| `auth` | `?mode=auth` | valide le code d'accès de la page |
| `discover` | `?mode=discover&site=URL` | robots.txt, sitemap, llms.txt, robots d'IA |
| `sitemap` | `?mode=sitemap&url=URL&origin=URL` | lit un fichier sitemap |
| `page` | `?mode=page&url=URL` | analyse complète d'une page |
| `verify` | `POST` avec `urls[]` | vérifie des liens (statut + redirections) |
| `traffic` | `?mode=traffic&site=URL` | intelligence trafic (DataForSEO) |
| `gap` | `?mode=gap&site=URL&competitor=URL` | écart de mots-clés (DataForSEO) |

`traffic` et `gap` exigent le code d'accès et les identifiants DataForSEO.
Variables d'environnement : `PAPARMANE_ACCESS_KEY`, `DATAFORSEO_LOGIN`,
`DATAFORSEO_PASSWORD`.

Le moteur connaît une trentaine de robots d'IA (GPTBot, ClaudeBot, PerplexityBot,
Applebot, Google-Extended…) et explique, pour chacun, la conséquence concrète d'un
blocage.

## Déploiement

Le repo est connecté à Netlify : chaque push sur `main` publie la racine telle
quelle (pas de build). Voir `netlify.toml` pour les en-têtes de cache — le CSS est
toujours revalidé, images / polices / vendor sont cachés une semaine.
