# Brancher Google Search Console sur Claude Code

Ce dossier permet à Claude Code d'interroger directement tes données Search Console
(clics, impressions, positions, indexation, sitemaps) grâce au serveur MCP open source
[mcp-gsc](https://github.com/AminForou/mcp-gsc) (licence MIT).

- `search-console.sh` lance le serveur (version figée : 0.4.1).
- `../../.mcp.json` le déclare à Claude Code sous le nom `search-console`.

La clé Google n'est **jamais** enregistrée dans le dépôt : elle vit uniquement dans
les réglages de ton environnement cloud.

---

## Mise en place (une seule fois, ~15 min)

### 1. Créer un compte de service Google

1. Va sur <https://console.cloud.google.com/> et crée un projet (par ex. `paparmane-seo`).
2. Active l'API Search Console :
   <https://console.cloud.google.com/apis/library/searchconsole.googleapis.com> → **Activer**.
3. Ouvre <https://console.cloud.google.com/iam-admin/serviceaccounts> →
   **Créer un compte de service** → nom : `claude-search-console` →
   **Créer et continuer** → aucun rôle à ajouter → **OK**.
4. Clique sur le compte créé → onglet **Clés** → **Ajouter une clé** →
   **Créer une clé** → **JSON**. Un fichier `.json` se télécharge.

Garde ce fichier en lieu sûr et ne le colle jamais dans le chat.

### 2. Donner accès à ton site dans Search Console

1. Ouvre le fichier `.json` et copie l'adresse du champ `client_email`
   (elle se termine par `.iam.gserviceaccount.com`).
2. Dans <https://search.google.com/search-console>, choisis ta propriété →
   **Paramètres** → **Utilisateurs et autorisations** → **Ajouter un utilisateur**.
3. Colle l'adresse et choisis **Restreint** (lecture seule : suffisant pour les
   performances, les mots-clés et les pages).

Pour un client : demande-lui d'ajouter cette même adresse à sa propriété.

### 3. Mettre la clé dans l'environnement cloud

1. Dans le Finder, fais un clic droit sur le fichier `.json` → **Ouvrir avec** →
   **TextEdit**, puis **Cmd + A** et **Cmd + C**.
2. Dans Claude Code sur le web : menu de l'environnement dans la barre de titre
   de la session → **Modifier** → **Variables d'environnement**. Tape
   `GSC_SERVICE_ACCOUNT_JSON='` (avec l'apostrophe), colle avec **Cmd + V**,
   puis tape une dernière apostrophe `'` après l'accolade finale. Le résultat
   ressemble à ceci :

   ```
   GSC_SERVICE_ACCOUNT_JSON='{
     "type": "service_account",
     ...
   }'
   ```

   Sans les apostrophes, la clé tient sur plusieurs lignes et la fenêtre refuse
   d'enregistrer.
3. Enregistre. Tu peux ensuite mettre le fichier `.json` à la corbeille.

Autre méthode, sur une seule ligne : dans le Terminal,
`base64 -i chemin/vers/la-cle.json | pbcopy`, puis colle le résultat après
`GSC_SERVICE_ACCOUNT_JSON=`.

### 4. Autoriser le serveur dans Claude Code

Par sécurité, Claude ne peut pas s'autoriser lui-même un nouveau serveur MCP.
Ajoute cette ligne dans `.claude/settings.local.json` (juste après l'accolade
d'ouverture), par exemple depuis l'éditeur de fichiers de GitHub :

```json
"enabledMcpjsonServers": ["search-console"],
```

### 5. Tester

Ouvre une **nouvelle session** (les réglages sont lus au démarrage) et demande :
« Liste mes propriétés Search Console ».

---

## Exemples de demandes

- « Quels mots-clés sont entre la 8e et la 20e position sur les 3 derniers mois ? »
  (les plus faciles à faire monter en première page)
- « Quelles pages ont beaucoup d'impressions mais peu de clics ? »
- « Compare les clics de ce mois-ci avec ceux du mois dernier. »
- « Vérifie l'indexation de ces pages : … »

## Dépannage

| Symptôme | Solution |
| --- | --- |
| `invalid_grant` / `account not found` | La clé a été supprimée ou mal copiée : recommence l'étape 3. |
| « permission » ou « site introuvable » | L'adresse `client_email` n'est pas ajoutée à cette propriété (étape 2). |
| Erreur de permission sur l'inspection d'URL ou l'envoi de sitemap | Passe le compte de service de **Restreint** à **Complet**. |
| Google refuse de créer la clé | Ton compte Google Cloud dépend d'une organisation qui interdit les clés : utilise un compte Google personnel. |

## Couper l'accès

Supprime la clé dans Google Cloud (compte de service → **Clés**) ou retire
l'utilisateur dans Search Console. L'accès est coupé immédiatement.

## Utilisation locale (Claude Code sur ton Mac)

Installe [uv](https://docs.astral.sh/uv/), puis définis
`GSC_CREDENTIALS_PATH=/chemin/absolu/vers/la-cle.json` avant de lancer `claude`.
