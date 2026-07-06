# PAPARMANE

Site vitrine de l'agence **Paparmane** — HTML statique, basé sur le template « Redox ».
Aucune étape de build : le contenu de la racine est publié tel quel.

## Stack

- **HTML statique** (template Redox, licence régulière) — aucun build
- **CSS + JS** du template dans `assets/`
- Formulaire de contact via **Netlify Forms**
- Déployé sur **Netlify**

## Pages du site

| Page | Fichier |
|------|---------|
| Accueil | `index.html` |
| À propos | `about.html` |
| Services | `services.html` · détail : `service-details.html` |
| Portfolio | `portfolio.html` · détail : `portfolio-details.html` |
| Blog | `blog.html` · détail : `blog-details.html` |
| Équipe | `team.html` · détail : `team-details.html` |
| FAQ | `faq.html` |
| Contact | `contact.html` |
| Erreur 404 | `404.html` |

Les assets partagés (CSS, JS, images, polices) sont dans `assets/`.

## Développement local

Le site est 100 % statique. Pour le prévisualiser en local :

```bash
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
```

## Déploiement

Le repo est connecté à Netlify. Chaque push déclenche une publication automatique
de la racine du repo (voir `netlify.toml`). Les formulaires sont gérés par Netlify Forms.
