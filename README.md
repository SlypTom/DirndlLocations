# Dirndl Locations

*Lire en [français](README.fr.md).*

Internal rental-management app for dirndls (traditional Austrian dresses):
tracks the item stock, customers, and active rentals from checkout through
return.

Built with Next.js (App Router) and Supabase, designed for daily use in-store
on iPad and MacBook.

## Features

**Items**
- List or photo-gallery view, search by reference / model / size / color
- Categories (Dirndl, Women's shirt, Men's shirt, Lederhosen) with a filter
- Detail page with edit and delete
- Lifecycle statuses: available, rented, needs cleaning, under repair

**Rentals**
- Create with multi-item selection (built-in search, already-picked items
  always visible), pick an existing customer or create one on the fly
- An already-rented item stays bookable on free dates (no double-booking on
  overlapping dates)
- One-click return and cancellation — items automatically flip to the right
  status
- Edit dates and price directly from the list
- Paid / unpaid status
- Overdue and upcoming rental detection

**Customers**
- Full profile (contact info, address, notes), inline edit and delete

**Dashboard**
- Stock counts by status, overdue returns surfaced first

## Tech stack

| Area           | Choice                                              |
| -------------- | ---------------------------------------------------- |
| Framework      | Next.js 16 (App Router), React 19, TypeScript        |
| Styling        | Tailwind CSS 4                                       |
| Backend        | Supabase (Postgres, Auth, Storage, Row Level Security) |
| Hosting        | Vercel                                               |

Operations that touch multiple tables (creating a rental, completing it,
cancelling it) go through transactional Postgres functions
(`supabase/schema.sql`) instead of separate client-side calls: either
everything is applied or nothing is, and row locking prevents two people from
renting out the same item at the same time.

## Getting started

### 1. Create the Supabase project

1. Create an account and a project on [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste the contents of `supabase/schema.sql` and run it.
   It creates the tables (`items`, `customers`, `rentals`, `rental_items`),
   the access rules (RLS), and the functions used to create/complete/cancel a
   rental. The file is safe to re-run: run it again after every update.
3. In **Storage**, create a bucket named `item-photos`, checked **Public**
   (so photos display directly). The policies that let the team upload/delete
   photos are already in `schema.sql`.
4. In **Authentication > Users**, add an account per team member (email +
   password) — that's what's used to sign in to the app.
5. In **Project Settings > API**, grab the project URL and the `anon public`
   key.

### 2. Configure the project locally

```bash
git clone https://github.com/SlypTom/DirndlLocations.git
cd DirndlLocations
cp .env.local.example .env.local
```

Open `.env.local` and fill in the URL and key from the previous step.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should land on the
sign-in screen.

### 3. Deploy (Vercel)

1. Push the project to GitHub (already done if you're reading this here).
2. On [Vercel](https://vercel.com), "Add New Project" > import the repo.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
   environment variables on the project.
4. Deploy — Vercel gives you a URL like `https://your-project.vercel.app`.

## Day-to-day use

On iPad, open the app's URL in Safari, then **Share > Add to Home Screen**:
it then opens full-screen like a native app. On MacBook, the URL works fine
in a regular browser.

## Project structure

```
app/
  page.tsx                dashboard (counters, overdue returns)
  login/page.tsx          sign in
  items/page.tsx          item list (list/gallery view)
  items/new/page.tsx      add an item (with photo)
  items/[id]/page.tsx     item detail (edit / delete)
  customers/page.tsx      customer list (edit / delete)
  customers/new/page.tsx  add a customer
  rentals/page.tsx        active rentals (edit / return / cancel)
  rentals/new/page.tsx    create a rental
lib/
  supabase/client.ts      Supabase connection
  auth-context.tsx        manages the session and guards pages
  types.ts                TypeScript types for the data
  dates.ts                today's date in local time (not UTC)
  item-photos.ts          upload / delete item photos
components/
  NavBar.tsx, StatusBadge.tsx, ItemForm.tsx, ItemPhoto.tsx
supabase/
  schema.sql              tables, RLS policies and RPC functions
```

## Security

- Data access is protected by Row Level Security on the Supabase side: only
  authenticated team accounts can read/write.
- Item photos follow the same principle on the Storage side (public read,
  upload/delete restricted to the team).
- No secrets are committed: `.env.local` is git-ignored, and the public
  Supabase (`anon`) key never has a hardcoded fallback in the code — without
  configuration, the connection fails cleanly instead of silently pointing at
  an existing project.

## Ideas for later

- A QR code per item + camera scanning to speed up checkout at the counter.
- Automatic reminders before a due date.
- CSV export of rentals for accounting.

---

Internal, private project — not intended for public distribution.
