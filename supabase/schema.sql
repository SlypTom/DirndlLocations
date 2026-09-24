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
  categorie text not null default 'dirndl'
    check (categorie in ('dirndl', 'chemise_femme', 'chemise_homme', 'lederhose')),
  photo_url text,
  created_at timestamptz not null default now()
);

-- Si la table items existait déjà avant l'ajout des catégories.
alter table items add column if not exists categorie text not null default 'dirndl';
alter table items drop constraint if exists items_categorie_check;
alter table items add constraint items_categorie_check
  check (categorie in ('dirndl', 'chemise_femme', 'chemise_homme', 'lederhose'));

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
  paye boolean not null default false,
  sorti boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

-- La boutique ne demande pas de caution : on retire ces colonnes si elles existent.
alter table rentals drop column if exists caution_montant;
alter table rentals drop column if exists caution_rendue;

-- Si la table rentals existait déjà avant l'ajout du statut de paiement / de sortie.
alter table rentals add column if not exists paye boolean not null default false;
alter table rentals add column if not exists sorti boolean not null default false;

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
-- et pour empêcher deux personnes de louer le même article sur des dates qui
-- se chevauchent (verrouillage des lignes concernées le temps de la
-- transaction). Un article "loué" reste réservable sur des dates libres :
-- seuls "à nettoyer" et "en réparation" bloquent totalement un article, peu
-- importe les dates. Le champ items.statut ne reflète que l'état physique
-- actuel ; la vraie disponibilité sur une période donnée se vérifie via les
-- dates des locations en cours, pas uniquement via ce statut.

-- Anciennes signatures (avant l'ajout de p_today) : à supprimer explicitement,
-- sinon "create or replace" avec une liste de paramètres différente crée une
-- fonction surchargée au lieu de remplacer l'existante.
drop function if exists create_rental(uuid, date, date, numeric, uuid[]);
drop function if exists cancel_rental(uuid);

create or replace function create_rental(
  p_customer_id uuid,
  p_date_debut date,
  p_date_fin_prevue date,
  p_prix_total numeric,
  p_item_ids uuid[],
  p_today date
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_rental_id uuid;
  v_unavailable text;
  v_item record;
begin
  if p_item_ids is null or array_length(p_item_ids, 1) is null then
    raise exception 'Aucun article sélectionné.';
  end if;

  -- FOR UPDATE ne peut pas se combiner à une fonction d'agrégation (string_agg)
  -- dans la même requête : on verrouille les lignes ici, puis on construit la
  -- liste des indisponibles à la main dans la boucle.
  v_unavailable := null;
  for v_item in
    select reference, statut
    from items
    where id = any(p_item_ids)
    for update
  loop
    if v_item.statut in ('nettoyage', 'reparation') then
      v_unavailable := concat_ws(', ', v_unavailable, v_item.reference);
    end if;
  end loop;

  if v_unavailable is not null then
    raise exception 'Article(s) indisponible(s) (à nettoyer ou en réparation) : %', v_unavailable;
  end if;

  select string_agg(distinct i.reference, ', ')
    into v_unavailable
  from rental_items ri
  join rentals r on r.id = ri.rental_id
  join items i on i.id = ri.item_id
  where ri.item_id = any(p_item_ids)
    and r.statut = 'en_cours'
    and r.date_debut <= p_date_fin_prevue
    and r.date_fin_prevue >= p_date_debut;

  if v_unavailable is not null then
    raise exception 'Article(s) déjà réservé(s) sur ces dates : %', v_unavailable;
  end if;

  insert into rentals (customer_id, date_debut, date_fin_prevue, prix_total, statut)
  values (p_customer_id, p_date_debut, p_date_fin_prevue, p_prix_total, 'en_cours')
  returning id into v_rental_id;

  insert into rental_items (rental_id, item_id, prix_unitaire)
  select v_rental_id, i.id, i.prix_location
  from items i
  where i.id = any(p_item_ids);

  -- Une réservation future ne "sort" pas l'article du magasin tout de suite :
  -- on ne bascule le statut physique que si la location démarre aujourd'hui
  -- ou avant.
  if p_date_debut <= p_today then
    update items set statut = 'loue' where id = any(p_item_ids);
  end if;

  return v_rental_id;
end;
$$;

-- Modifie intégralement une location en cours (client, dates, prix, articles).
-- Les articles retirés redeviennent disponibles (s'ils étaient "loué" à cause
-- de cette location) ; les articles ajoutés suivent les mêmes règles que la
-- création (bloqués si à nettoyer/en réparation, ou déjà réservés sur des
-- dates qui se chevauchent avec une AUTRE location en cours).
create or replace function update_rental(
  p_rental_id uuid,
  p_customer_id uuid,
  p_date_debut date,
  p_date_fin_prevue date,
  p_prix_total numeric,
  p_item_ids uuid[],
  p_today date
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_unavailable text;
  v_item record;
  v_removed_items uuid[];
begin
  if p_item_ids is null or array_length(p_item_ids, 1) is null then
    raise exception 'Aucun article sélectionné.';
  end if;

  perform 1 from rentals where id = p_rental_id and statut = 'en_cours' for update;
  if not found then
    raise exception 'Location introuvable ou déjà clôturée.';
  end if;

  v_unavailable := null;
  for v_item in
    select reference, statut
    from items
    where id = any(p_item_ids)
    for update
  loop
    if v_item.statut in ('nettoyage', 'reparation') then
      v_unavailable := concat_ws(', ', v_unavailable, v_item.reference);
    end if;
  end loop;

  if v_unavailable is not null then
    raise exception 'Article(s) indisponible(s) (à nettoyer ou en réparation) : %', v_unavailable;
  end if;

  select string_agg(distinct i.reference, ', ')
    into v_unavailable
  from rental_items ri
  join rentals r on r.id = ri.rental_id
  join items i on i.id = ri.item_id
  where ri.item_id = any(p_item_ids)
    and r.id <> p_rental_id
    and r.statut = 'en_cours'
    and r.date_debut <= p_date_fin_prevue
    and r.date_fin_prevue >= p_date_debut;

  if v_unavailable is not null then
    raise exception 'Article(s) déjà réservé(s) sur ces dates : %', v_unavailable;
  end if;

  select array_agg(item_id) into v_removed_items
  from rental_items
  where rental_id = p_rental_id and item_id <> all(p_item_ids);

  if v_removed_items is not null then
    update items set statut = 'disponible'
      where id = any(v_removed_items) and statut = 'loue';
  end if;

  update rentals
    set customer_id = p_customer_id,
        date_debut = p_date_debut,
        date_fin_prevue = p_date_fin_prevue,
        prix_total = p_prix_total
    where id = p_rental_id;

  delete from rental_items where rental_id = p_rental_id;

  insert into rental_items (rental_id, item_id, prix_unitaire)
  select p_rental_id, i.id, i.prix_location
  from items i
  where i.id = any(p_item_ids);

  if p_date_debut <= p_today then
    update items set statut = 'loue' where id = any(p_item_ids);
  end if;
end;
$$;

create or replace function complete_rental(p_rental_id uuid, p_date_retour date)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_date_debut date;
begin
  update rentals
    set statut = 'terminee', date_retour_reelle = p_date_retour
    where id = p_rental_id and statut = 'en_cours'
    returning date_debut into v_date_debut;

  if not found then
    raise exception 'Location introuvable ou déjà clôturée.';
  end if;

  if v_date_debut <= p_date_retour then
    update items
      set statut = 'nettoyage'
      where id in (select item_id from rental_items where rental_id = p_rental_id);
  end if;

  delete from rental_items where rental_id = p_rental_id;
end;
$$;

create or replace function cancel_rental(p_rental_id uuid, p_today date)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_date_debut date;
begin
  update rentals
    set statut = 'annulee'
    where id = p_rental_id and statut = 'en_cours'
    returning date_debut into v_date_debut;

  if not found then
    raise exception 'Location introuvable ou déjà clôturée.';
  end if;

  if v_date_debut <= p_today then
    update items
      set statut = 'disponible'
      where id in (select item_id from rental_items where rental_id = p_rental_id);
  end if;

  delete from rental_items where rental_id = p_rental_id;
end;
$$;

-- Après avoir exécuté ce fichier :
-- 1. Storage > New bucket > nom "item-photos" > coche "Public bucket".
-- 2. Authentication > Users > Add user, pour chaque membre de l'équipe.
