# Récréaction · prototype

Prototype cliquable de Récréaction, l'app qui bonifie l'expérience des participants
d'un événement sportif, présenté avec la Course Des-Chênes-Toi! Bourret 2027 :
inscription, sécurité en course, photos par dossard, encouragements, plan du site,
parcours, bénévoles, partenaires et inscription à l'édition suivante.

**Démo seulement** : pas de vrais comptes, paiements ni données. Les personnes, les prix,
les montants et les offres des partenaires sont fictifs ou à confirmer avec l'organisateur.

## Contenu

- `index.html` : la liste des 30 écrans, classés par public.
- `plan-interactif.html` et `plan-des-chenes-toi.jpg` : le plan du site 4 × 8 en version web.
- `logo-des-chenes-toi.png` : le logo de la course, posé sur les photos partagées.
- Un fichier `.html` par écran (téléphone, ordinateur, courriel ou télé).
- `runtime.js` : le petit moteur qui affiche chaque écran et ses interactions.
- `prototype.css` : l'habillage autour des écrans à taille fixe.

Aucune étape de compilation : ce sont des fichiers statiques.

## Mise en ligne

- **Dans le site PAPARMANE** : Netlify publie déjà la racine du dépôt. Une fois la branche
  fusionnée dans `main`, le prototype est servi à l'adresse du site suivie de `/recreaction/`.
- **Dans son propre site Netlify** : publier ce dossier tel quel (`netlify.toml` inclus).

Les pages portent `noindex` pour ne pas apparaître dans les moteurs de recherche.
