# PAPARMANE

Site vitrine d'agence créative / portfolio — design original inspiré de l'esthétique « Redox ».
Construit avec [Astro](https://astro.build) et animé avec [GSAP](https://gsap.com).

## Stack

- **Astro 5** — génération de site statique, zéro JS par défaut
- **GSAP + ScrollTrigger** — animations au scroll
- **CSS pur** — thème sombre, design tokens via variables CSS
- Déployé sur **Netlify**

## Développement

```bash
npm install       # installe les dépendances
npm run dev       # serveur de dev sur http://localhost:4321
npm run build     # build de production dans dist/
npm run preview   # prévisualise le build
```

## Structure

```
src/
  layouts/Layout.astro       # shell HTML, fonts, import du script
  components/                # Header, Hero, Stats, About, Services, Work, Quote, Contact, Footer
  pages/index.astro          # page d'accueil (assemble les composants)
  scripts/main.js            # preloader, curseur, reveals, compteurs, marquee, tilt
  styles/global.css          # thème + tous les styles
public/favicon.svg
```

## Déploiement

Le repo est connecté à Netlify. Chaque push sur `main` déclenche un build automatique
(`npm run build` → publie `dist/`). Voir `netlify.toml`.

---

Design & contenu = placeholders à personnaliser (textes, projets, coordonnées).
