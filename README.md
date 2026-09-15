# Trachten Locations

Suivi interne des locations de dirndl : articles, clients, locations en cours,
retours en retard. Construit avec Next.js (App Router), TypeScript, Tailwind
CSS et Supabase (base de données, stockage des photos, authentification).

## 1. Créer le projet Supabase

1. Va sur https://supabase.com, crée un compte et un nouveau projet.
2. Dans **SQL Editor**, colle le contenu de `supabase/schema.sql` et exécute-le.
   Ça crée les tables `items`, `customers`, `rentals`, `rental_items` et les
   règles d'accès.
3. Dans **Storage**, crée un bucket nommé `item-photos`, coché **Public**
   (pour que les photos s'affichent directement).
4. Dans **Authentication > Users**, ajoute un compte pour chaque membre de
   l'équipe (email + mot de passe) — c'est ce qui servira à se connecter à
   l'appli.
5. Dans **Project Settings > API**, récupère l'URL du projet et la clé
   `anon public`.

## 2. Configurer le projet en local

```bash
cp .env.local.example .env.local
```

Ouvre `.env.local` et colle l'URL + la clé récupérées à l'étape précédente.

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000 — tu devrais arriver sur l'écran de connexion.

## 3. Utilisation sur l'iPad et le MacBook

Ouvre l'adresse de l'app dans Safari sur l'iPad, puis **Partager > Sur l'écran
d'accueil** : elle s'ouvrira ensuite en plein écran comme une vraie
application. Le MacBook peut simplement utiliser l'adresse dans son
navigateur habituel.

## 4. Mettre l'app en ligne (pour y accéder depuis n'importe où)

Le plus simple est [Vercel](https://vercel.com) :

1. Pousse ce projet sur un dépôt GitHub.
2. Sur Vercel, "Add New Project" > importe le dépôt.
3. Ajoute les deux variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dans les réglages du projet Vercel.
4. Déploie — Vercel te donne une URL type `https://ton-projet.vercel.app`.

## Structure du projet

```
app/
  page.tsx              tableau de bord (compteurs, retards)
  login/page.tsx         connexion
  items/page.tsx          liste des articles (vue liste/galerie)
  items/new/page.tsx        ajouter un article (avec photo)
  items/[id]/page.tsx      détail d'un article (modifier / supprimer)
  customers/page.tsx      liste des clients (modifier / supprimer)
  customers/new/page.tsx    ajouter un client
  rentals/page.tsx        liste des locations, marquer un retour
  rentals/new/page.tsx      créer une location
lib/
  supabase/client.ts    connexion à Supabase
  auth-context.tsx      gère la session et protège les pages
  types.ts              types TypeScript des données
components/
  NavBar.tsx, StatusBadge.tsx
supabase/
  schema.sql             à exécuter une fois dans Supabase
```

## Pour la suite (idées d'améliorations)

- Génération d'un QR code par article + scan à la caméra pour aller plus
  vite au comptoir (`qrcode` pour générer, `html5-qrcode` pour scanner).
- Rappels automatiques avant une date de retour (nécessite une fonction
  planifiée côté Supabase ou un service externe).
- Export CSV des locations pour la compta.
