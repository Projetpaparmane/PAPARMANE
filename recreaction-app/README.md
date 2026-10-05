# Récréaction · l’app (version 1)

L’app qui bonifie l’expérience des participants d’un événement sportif. Cette première version couvre le cœur :

- **Page d’événement et inscription** : choix de la distance, coordonnées, t-shirt, personne à joindre, décharge,
  consentement à l’infolettre, calcul de la TPS et de la TVQ.
- **Paiement par Stripe** (page de paiement Stripe, en français, en dollars canadiens).
- **Dossard attribué automatiquement** après le paiement, sans doublon, par plage de numéros propre à chaque distance.
- **Compte du participant**, connexion par lien envoyé par courriel (sans mot de passe) : dossard numérique avec
  code QR et **fiche médicale d’urgence**, visible par le participant seulement et supprimée 30 jours après l’événement.
- **Espace organisateur** : inscriptions, revenus, répartition par distance et par taille de t-shirt, recherche,
  export CSV (Excel) et **remise des dossards** en scannant le code QR.

Technologies : Next.js 16, Supabase (base de données et connexion), Stripe (paiement), Netlify (hébergement).

---

## Mise en ligne, étape par étape

Comptez environ 30 minutes. Faites tout en **mode test** de Stripe d’abord : aucun vrai argent ne circule.

### 1. Supabase (base de données)

1. Créez un compte sur [supabase.com](https://supabase.com), puis un projet. **Région : Canada (Central)**, pour
   garder les renseignements personnels au Canada.
2. Menu **SQL Editor** > **New query** : collez le contenu de `supabase/migrations/0001_init.sql`, puis **Run**.
3. Nouvelle requête : collez `supabase/seed.sql` (l’événement de démonstration), puis **Run**. Modifiez ensuite
   le nom, la date, les distances et les prix dans **Table Editor**, ou directement dans ce fichier avant de l’exécuter.
4. **Authentication** > **URL Configuration** :
   - *Site URL* : l’adresse de votre site Netlify (étape 3), par exemple `https://recreaction.netlify.app` ;
   - *Redirect URLs* : ajoutez `https://recreaction.netlify.app/auth/confirm`.
5. **Authentication** > **Emails** > **Magic Link** : remplacez le lien du modèle par celui-ci, pour que le lien
   fonctionne même s’il est ouvert sur un autre appareil :

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/moi
   ```

6. **Project Settings** > **API Keys** : notez l’URL du projet, la *publishable key* et une *secret key*.

> Le service de courriel inclus avec Supabase est limité à quelques envois par heure. Avant d’ouvrir les inscriptions
> au public, branchez un service d’envoi (Resend, Postmark…) dans **Authentication** > **Emails** > **SMTP Settings**.

### 2. Stripe (paiement)

1. Créez un compte sur [stripe.com](https://stripe.com) (entreprise au Canada) et restez en **mode test**.
2. **Développeurs** > **Clés API** : notez la *clé secrète* (`sk_test_…`).
3. **Développeurs** > **Webhooks** > **Ajouter une destination** :
   - adresse : `https://recreaction.netlify.app/api/stripe/webhook` ;
   - événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired` ;
   - notez la *clé de signature* (`whsec_…`).
4. **Paramètres** > **Courriels aux clients** : activez les reçus pour les paiements réussis.

### 3. Netlify (hébergement)

1. **Add new project** > **Import an existing project** > GitHub > dépôt **PAPARMANE**.
2. **Base directory** : `recreaction-app`. Le reste est lu dans `netlify.toml`.
3. **Environment variables** : ajoutez les cinq valeurs de `.env.example` (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).
4. **Deploy**. Pour le nom de domaine (par exemple `recreaction.ca`) : **Domain management**.

Ce site est séparé du site de l’agence : il ne se redéploie que lorsque le dossier `recreaction-app` change.

### 4. Tester un paiement

Sur la page de l’événement, inscrivez-vous et payez avec la carte de test Stripe **4242 4242 4242 4242**, une date
d’expiration future et n’importe quel code. Vous arrivez sur la page de remerciement avec votre numéro de dossard.

### 5. Donner l’accès organisateur

Connectez-vous une première fois dans l’app avec votre courriel (bouton **Mon compte**), puis exécutez dans Supabase :

```sql
insert into public.organization_members (organization_id, user_id, role)
select o.id, u.id, 'admin'
from public.organizations o, auth.users u
where o.name = 'Organisation démo' and u.email = 'votre-courriel@exemple.com';
```

Le lien **Espace organisateur** apparaît ensuite dans **Mon compte**.

### 6. Suppression automatique des fiches médicales (Loi 25)

**Database** > **Extensions** : activez `pg_cron`, puis exécutez une fois :

```sql
select cron.schedule('purge-fiches-medicales', '0 4 * * *', 'select public.purge_medical_cards()');
```

---

## À valider avant d’ouvrir au public

- **Taxes** : l’app ajoute la TPS et la TVQ au prix de l’inscription (réglable par événement avec la colonne
  `taxable`) et aux frais de service. Faites valider ce traitement par votre comptable.
- **Politique de confidentialité** (`/confidentialite`) : complétez le nom de la personne responsable et la région
  d’hébergement, et faites-la valider.
- **Décharge** : le texte de démonstration est dans `seed.sql`. Remplacez-le par celui de l’organisateur.

## Prochaines étapes prévues

- Verser automatiquement l’argent aux organisateurs (Stripe Connect).
- Courriel de confirmation personnalisé avec le dossard.
- Accès de l’équipe médicale aux fiches le jour J, avec journal des consultations.
- Bénévoles, photos par dossard, encouragements, infolettre : voir le prototype dans `../recreaction`.

## Travailler sur le code

```bash
cd recreaction-app
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
npm test                     # tests automatiques
npm run lint && npm run typecheck
```

Structure :

- `src/app/e/[slug]` : page d’événement, formulaire d’inscription et paiement.
- `src/app/api/stripe/webhook` : confirmation des paiements envoyée par Stripe.
- `src/app/moi` : compte du participant, dossard et fiche médicale.
- `src/app/organisateur` : espace organisateur, export CSV et remise des dossards.
- `supabase/migrations` : tables et règles d’accès. Chaque personne ne voit que ce qui la concerne.
