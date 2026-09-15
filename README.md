# Dirndl Locations

*Read this in [English](README.en.md).*

Application interne de gestion de location de dirndls (tenues traditionnelles
autrichiennes) : suivi du stock d'articles, des clients et des locations en
cours, du prêt jusqu'au retour.

Construite avec Next.js (App Router) et Supabase, pensée pour un usage
quotidien en boutique sur iPad et MacBook.

## Fonctionnalités

**Articles**
- Vue liste ou galerie photo, recherche par référence / modèle / taille / couleur
- Fiche détail avec modification et suppression
- Statuts de cycle de vie : disponible, loué, à nettoyer, en réparation

**Locations**
- Création avec sélection multi-articles (recherche intégrée, articles déjà
  choisis toujours visibles), client existant ou nouveau créé à la volée
- Retour et annulation en un clic — les articles repassent automatiquement
  au bon statut
- Modification des dates et du prix directement depuis la liste
- Détection des retards

**Clients**
- Fiche complète (contact, adresse, notes), modification et suppression
  inline

**Tableau de bord**
- Compteurs de stock par statut, retours en retard à traiter en priorité

## Stack technique

| Domaine        | Choix                                             |
| -------------- | -------------------------------------------------- |
| Framework      | Next.js 16 (App Router), React 19, TypeScript      |
| Style          | Tailwind CSS 4                                     |
| Backend        | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Hébergement    | Vercel                                             |

Les opérations qui touchent plusieurs tables (créer une location, la
terminer, l'annuler) passent par des fonctions Postgres transactionnelles
(`supabase/schema.sql`) plutôt que des appels séparés côté client : soit tout
est appliqué, soit rien ne l'est, et le verrouillage des lignes empêche deux
personnes de louer le même article en même temps.

## Démarrage rapide

### 1. Créer le projet Supabase

1. Crée un compte et un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, colle le contenu de `supabase/schema.sql` et exécute-le.
   Il crée les tables (`items`, `customers`, `rentals`, `rental_items`), les
   règles d'accès (RLS) et les fonctions utilisées pour créer/terminer/annuler
   une location. Le fichier est rejouable sans risque : réexécute-le après
   chaque mise à jour.
3. Dans **Storage**, crée un bucket nommé `item-photos`, coché **Public**
   (pour que les photos s'affichent directement). Les policies qui autorisent
   l'équipe à uploader/supprimer des photos sont déjà dans `schema.sql`.
4. Dans **Authentication > Users**, ajoute un compte par membre de l'équipe
   (email + mot de passe) — c'est ce qui sert à se connecter à l'appli.
5. Dans **Project Settings > API**, récupère l'URL du projet et la clé
   `anon public`.

### 2. Configurer le projet en local

```bash
git clone https://github.com/SlypTom/DirndlLocations.git
cd DirndlLocations
cp .env.local.example .env.local
```

Ouvre `.env.local` et renseigne l'URL et la clé récupérées à l'étape
précédente.

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) — tu devrais arriver sur
l'écran de connexion.

### 3. Déployer (Vercel)

1. Pousse le projet sur GitHub (déjà fait si tu lis ceci ici).
2. Sur [Vercel](https://vercel.com), "Add New Project" > importe le dépôt.
3. Ajoute `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans
   les variables d'environnement du projet.
4. Déploie — Vercel fournit une URL du type `https://ton-projet.vercel.app`.

## Utilisation au quotidien

Sur iPad, ouvre l'adresse de l'app dans Safari puis **Partager > Sur l'écran
d'accueil** : elle s'ouvre ensuite en plein écran comme une application
native. Sur MacBook, l'URL suffit dans un navigateur classique.

## Structure du projet

```
app/
  page.tsx                tableau de bord (compteurs, retards)
  login/page.tsx          connexion
  items/page.tsx          liste des articles (vue liste/galerie)
  items/new/page.tsx      ajouter un article (avec photo)
  items/[id]/page.tsx     détail d'un article (modifier / supprimer)
  customers/page.tsx      liste des clients (modifier / supprimer)
  customers/new/page.tsx  ajouter un client
  rentals/page.tsx        locations en cours (modifier / retour / annuler)
  rentals/new/page.tsx    créer une location
lib/
  supabase/client.ts      connexion à Supabase
  auth-context.tsx        gère la session et protège les pages
  types.ts                types TypeScript des données
  dates.ts                date du jour en heure locale (pas UTC)
  item-photos.ts          upload / suppression des photos d'articles
components/
  NavBar.tsx, StatusBadge.tsx, ItemForm.tsx, ItemPhoto.tsx
supabase/
  schema.sql              tables, policies RLS et fonctions RPC
```

## Sécurité

- Accès aux données protégé par Row Level Security côté Supabase : seuls les
  comptes authentifiés de l'équipe peuvent lire/écrire.
- Les photos d'articles suivent le même principe côté Storage (lecture
  publique, upload/suppression réservés à l'équipe).
- Aucun secret n'est versionné : `.env.local` est ignoré par Git, et la clé
  Supabase publique (`anon`) n'a jamais de valeur par défaut en dur dans le
  code — sans configuration, la connexion échoue proprement plutôt que de
  pointer vers un projet existant par erreur.

## Pistes d'amélioration

- QR code par article + scan à la caméra pour aller plus vite au comptoir.
- Rappels automatiques avant une date de retour.
- Export CSV des locations pour la comptabilité.

---

Projet interne et privé, non destiné à la distribution publique.
