-- Schéma pour l'application de suivi des locations de dirndl.
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run.

create extension if not exists "pgcrypto";

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  reference text not null,
  modele text not null,
  taille text not null,
  couleur text,
  etat text,
  prix_location numeric(8, 2) not null default 0,
  statut text not null default 'disponible'
    check (statut in ('disponible', 'loue', 'nettoyage', 'reparation')),
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text,
  email text,
  adresse text,
  notes text,
  created_at timestamptz not null default now()
);

-- Si la table customers existait déjà avant l'ajout du champ adresse.
alter table customers add column if not exists adresse text;

create table if not exists rentals (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  date_debut date not null default current_date,
  date_fin_prevue date not null,
  date_retour_reelle date,
  caution_montant numeric(8, 2) not null default 0,
  caution_rendue boolean not null default false,
  prix_total numeric(8, 2) not null default 0,
  statut text not null default 'en_cours'
    check (statut in ('en_cours', 'terminee', 'annulee')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists rental_items (
  rental_id uuid not null references rentals(id) on delete cascade,
  item_id uuid not null references items(id),
  prix_unitaire numeric(8, 2) not null default 0,
  primary key (rental_id, item_id)
);

-- Row Level Security : accès complet réservé aux utilisatrices connectées
-- (l'équipe du magasin), ce qui suffit pour un usage interne.
alter table items enable row level security;
alter table customers enable row level security;
alter table rentals enable row level security;
alter table rental_items enable row level security;

create policy "Équipe : accès complet aux articles" on items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Équipe : accès complet aux clientes" on customers
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Équipe : accès complet aux locations" on rentals
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Équipe : accès complet aux lignes de location" on rental_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Après avoir exécuté ce fichier :
-- 1. Storage > New bucket > nom "item-photos" > coche "Public bucket".
-- 2. Authentication > Users > Add user, pour chaque membre de l'équipe.
