# Récréaction · prototype

Prototype cliquable de Récréaction, l'app qui bonifie l'expérience des participants
d'un événement sportif (course, trail, rassemblement) : inscription, sécurité en course,
photos par dossard, encouragements, infolettre, bénévoles et partenaires.

**Démo seulement** : pas de vrais comptes, paiements ni données. L'événement, les personnes,
les commerces et les prix sont fictifs.

## Contenu

- `index.html` : la liste des 23 écrans, classés par public.
- Un fichier `.html` par écran (téléphone, ordinateur, courriel ou télé).
- `runtime.js` : le petit moteur qui affiche chaque écran et ses interactions.
- `prototype.css` : l'habillage autour des écrans à taille fixe.

Aucune étape de compilation : ce sont des fichiers statiques.

## Mise en ligne

- **Dans le site PAPARMANE** : Netlify publie déjà la racine du dépôt. Une fois la branche
  fusionnée dans `main`, le prototype est servi à l'adresse du site suivie de `/recreaction/`.
- **Dans son propre site Netlify** : publier ce dossier tel quel (`netlify.toml` inclus).

Les pages portent `noindex` pour ne pas apparaître dans les moteurs de recherche.
