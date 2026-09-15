-- Schéma pour l'application de suivi des locations de dirndl.
-- À exécuter dans Supabase : Dashboard > SQL Editor > New query > coller > Run.
-- Ce fichier est rejouable sans risque sur une base déjà existante.

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
  prix_total numeric(8, 2) not null default 0,
  statut text not null default 'en_cours'
    check (statut in ('en_cours', 'terminee', 'annulee')),
  notes text,
  created_at timestamptz not null default now()
);

-- La boutique ne demande pas de caution : on retire ces colonnes si elles existent.
alter table rentals drop column if exists caution_montant;
alter table rentals drop column if exists caution_rendue;

create table if not exists rental_items (
  rental_id uuid not null references rentals(id) on delete cascade,
  item_id uuid not null references items(id),
  prix_unitaire numeric(8, 2) not null default 0,
  primary key (rental_id, item_id)
);

-- Row Level Security : accès complet réservé aux utilisateurs connectés
-- (l'équipe du magasin), ce qui suffit pour un usage interne.
alter table items enable row level security;
alter table customers enable row level security;
alter table rentals enable row level security;
alter table rental_items enable row level security;

drop policy if exists "Équipe : accès complet aux articles" on items;
create policy "Équipe : accès complet aux articles" on items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Équipe : accès complet aux clientes" on customers;
drop policy if exists "Équipe : accès complet aux clients" on customers;
create policy "Équipe : accès complet aux clients" on customers
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Équipe : accès complet aux locations" on rentals;
create policy "Équipe : accès complet aux locations" on rentals
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Équipe : accès complet aux lignes de location" on rental_items;
create policy "Équipe : accès complet aux lignes de location" on rental_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Storage : le bucket "item-photos" doit être créé à la main une première fois
-- (Storage > New bucket > nom "item-photos" > coche "Public bucket"), mais les
-- policies ci-dessous sont ce qui autorise réellement la lecture / l'upload /
-- la suppression des photos — "Public" seul ne couvre que la lecture.
drop policy if exists "Lecture publique des photos d'articles" on storage.objects;
create policy "Lecture publique des photos d'articles" on storage.objects
  for select using (bucket_id = 'item-photos');

drop policy if exists "Équipe : upload des photos d'articles" on storage.objects;
create policy "Équipe : upload des photos d'articles" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos');

drop policy if exists "Équipe : suppression des photos d'articles" on storage.objects;
create policy "Équipe : suppression des photos d'articles" on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-photos');

-- Fonctions RPC : regroupent en une seule transaction les opérations qui
-- touchent plusieurs tables (location + lignes d'articles + statut des
-- articles), pour éviter les données à moitié écrites si une étape échoue,
-- et pour empêcher deux personnes de louer le même article en même temps
-- (verrouillage des lignes concernées le temps de la transaction).

create or replace function create_rental(
  p_customer_id uuid,
  p_date_debut date,
  p_date_fin_prevue date,
  p_prix_total numeric,
  p_item_ids uuid[]
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_rental_id uuid;
  v_unavailable text;
begin
  if p_item_ids is null or array_length(p_item_ids, 1) is null then
    raise exception 'Aucun article sélectionné.';
  end if;

  select string_agg(reference, ', ')
    into v_unavailable
    from items
    where id = any(p_item_ids)
      and statut <> 'disponible'
    for update;

  if v_unavailable is not null then
    raise exception 'Article(s) déjà indisponible(s) : %', v_unavailable;
  end if;

  insert into rentals (customer_id, date_debut, date_fin_prevue, prix_total, statut)
  values (p_customer_id, p_date_debut, p_date_fin_prevue, p_prix_total, 'en_cours')
  returning id into v_rental_id;

  insert into rental_items (rental_id, item_id, prix_unitaire)
  select v_rental_id, i.id, i.prix_location
  from items i
  where i.id = any(p_item_ids);

  update items set statut = 'loue' where id = any(p_item_ids);

  return v_rental_id;
end;
$$;

create or replace function complete_rental(p_rental_id uuid, p_date_retour date)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update rentals
    set statut = 'terminee', date_retour_reelle = p_date_retour
    where id = p_rental_id and statut = 'en_cours';

  if not found then
    raise exception 'Location introuvable ou déjà clôturée.';
  end if;

  update items
    set statut = 'nettoyage'
    where id in (select item_id from rental_items where rental_id = p_rental_id);

  delete from rental_items where rental_id = p_rental_id;
end;
$$;

create or replace function cancel_rental(p_rental_id uuid)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update rentals
    set statut = 'annulee'
    where id = p_rental_id and statut = 'en_cours';

  if not found then
    raise exception 'Location introuvable ou déjà clôturée.';
  end if;

  update items
    set statut = 'disponible'
    where id in (select item_id from rental_items where rental_id = p_rental_id);

  delete from rental_items where rental_id = p_rental_id;
end;
$$;

-- Après avoir exécuté ce fichier :
-- 1. Storage > New bucket > nom "item-photos" > coche "Public bucket".
-- 2. Authentication > Users > Add user, pour chaque membre de l'équipe.
