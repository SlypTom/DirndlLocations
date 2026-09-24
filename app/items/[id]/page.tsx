"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Item, ItemStatus } from "@/lib/types";
import { ITEM_CATEGORY_LABELS, ITEM_STATUS_LABELS } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ItemPhoto from "@/components/ItemPhoto";
import ItemForm, { type ItemFormPayload } from "@/components/ItemForm";
import { deleteItemPhoto } from "@/lib/item-photos";

const STATUS_OPTIONS: ItemStatus[] = [
  "disponible",
  "loue",
  "nettoyage",
  "reparation",
];

interface Reservation {
  date_debut: string;
  date_fin_prevue: string;
  customerNom: string | null;
}

export default function ItemDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    const [itemRes, reservationsRes] = await Promise.all([
      supabase.from("items").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("rental_items")
        .select(
          "rental:rentals!inner(date_debut, date_fin_prevue, statut, customer:customers(nom))"
        )
        .eq("item_id", params.id)
        .eq("rental.statut", "en_cours"),
    ]);

    if (itemRes.error) setError(itemRes.error.message);
    else if (!itemRes.data) setNotFound(true);
    else setItem(itemRes.data);

    if (reservationsRes.data) {
      setReservations(
        (
          reservationsRes.data as unknown as {
            rental: {
              date_debut: string;
              date_fin_prevue: string;
              customer: { nom: string } | null;
            };
          }[]
        )
          .map((r) => ({
            date_debut: r.rental.date_debut,
            date_fin_prevue: r.rental.date_fin_prevue,
            customerNom: r.rental.customer?.nom ?? null,
          }))
          .sort((a, b) => a.date_debut.localeCompare(b.date_debut))
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch is intentional: it re-syncs with Supabase when the route param changes
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function updateStatus(statut: ItemStatus) {
    if (!item) return;
    const previous = item;
    setItem({ ...item, statut });
    const { error } = await supabase
      .from("items")
      .update({ statut })
      .eq("id", item.id);
    if (error) {
      setItem(previous);
      setError(error.message);
    }
  }

  async function handleSave(payload: ItemFormPayload) {
    if (!item) return;
    const { error } = await supabase
      .from("items")
      .update(payload)
      .eq("id", item.id);
    if (error) return error.message;
    setItem({ ...item, ...payload });
    setEditing(false);
  }

  async function handleDelete() {
    if (!item) return;
    if (
      !window.confirm(
        `Supprimer définitivement l'article ${item.reference} ? Cette action est irréversible.`
      )
    )
      return;

    setDeleting(true);
    setError(null);
    const { error } = await supabase.from("items").delete().eq("id", item.id);
    setDeleting(false);

    if (error) {
      if (error.code === "23503") {
        setError(
          "Impossible de supprimer cet article : il est lié à une ou plusieurs locations. Retire-le d'abord des locations concernées."
        );
      } else {
        setError(error.message);
      }
      return;
    }
    if (item.photo_url) {
      deleteItemPhoto(item.photo_url);
    }
    router.push("/items");
  }

  if (loading) {
    return <p className="text-sm text-foreground/60">Chargement...</p>;
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-foreground/60">Article introuvable.</p>
        <Link href="/items" className="text-sm text-primary hover:underline">
          &larr; Retour aux articles
        </Link>
      </div>
    );
  }

  if (!item) {
    return (
      <p className="rounded-md bg-danger-light px-4 py-3 text-sm text-danger">
        {error}
      </p>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/items" className="text-sm text-primary hover:underline">
          &larr; Retour aux articles
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {editing ? (
        <>
          <h1 className="font-heading text-3xl text-primary-dark">
            Modifier l&apos;article
          </h1>
          <ItemForm
            initialValues={{
              reference: item.reference,
              modele: item.modele,
              categorie: item.categorie,
              taille: item.taille,
              couleur: item.couleur,
              etat: item.etat,
              prix_location: String(item.prix_location),
            }}
            initialPhotoUrl={item.photo_url}
            submitLabel="Enregistrer les modifications"
            savingLabel="Enregistrement..."
            onSubmit={handleSave}
            extraActions={
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-background"
              >
                Annuler
              </button>
            }
          />
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row">
            <ItemPhoto
              url={item.photo_url}
              alt={item.reference}
              className="h-24 w-24 shrink-0 rounded-lg border border-border sm:h-32 sm:w-32"
            />
            <div className="min-w-0 space-y-2">
              <h1 className="font-heading text-2xl text-primary-dark">
                {item.reference}
              </h1>
              <p className="text-foreground/70">{item.modele}</p>
              <p className="text-sm text-foreground/60">
                {ITEM_CATEGORY_LABELS[item.categorie]}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  status={item.statut}
                  label={ITEM_STATUS_LABELS[item.statut]}
                />
                <select
                  value={item.statut}
                  onChange={(e) => updateStatus(e.target.value as ItemStatus)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {ITEM_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-lg border border-border bg-surface p-4 text-sm">
            <div>
              <dt className="text-foreground/60">Taille</dt>
              <dd className="font-medium">{item.taille}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Couleur</dt>
              <dd className="font-medium">{item.couleur || "—"}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">État</dt>
              <dd className="font-medium">{item.etat || "—"}</dd>
            </div>
            <div>
              <dt className="text-foreground/60">Prix de location</dt>
              <dd className="font-medium">{item.prix_location} €</dd>
            </div>
          </dl>

          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-sm font-medium">Réservations en cours</p>
            {reservations.length === 0 ? (
              <p className="mt-1 text-sm text-foreground/60">
                Aucune réservation en cours — l&apos;article est libre pour
                n&apos;importe quelle date.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {reservations.map((r, i) => (
                  <li key={i} className="flex flex-wrap justify-between gap-2">
                    <span>
                      Du{" "}
                      {new Date(r.date_debut).toLocaleDateString("fr-FR")} au{" "}
                      {new Date(r.date_fin_prevue).toLocaleDateString(
                        "fr-FR"
                      )}
                    </span>
                    <span className="text-foreground/60">
                      {r.customerNom ?? "Client inconnu"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Modifier
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger hover:bg-danger-light disabled:opacity-60"
            >
              {deleting ? "Suppression..." : "Supprimer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
