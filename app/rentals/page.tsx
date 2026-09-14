"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Rental } from "@/lib/types";
import { RENTAL_STATUS_LABELS } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("rentals")
      .select("*, customer:customers(*), rental_items(*, item:items(*))")
      .order("date_debut", { ascending: false });
    if (error) setError(error.message);
    else setRentals((data as unknown as Rental[]) ?? []);
    setLoading(false);
  }

  function isOverdue(rental: Rental) {
    const today = new Date().toISOString().slice(0, 10);
    return rental.statut === "en_cours" && rental.date_fin_prevue < today;
  }

  async function markReturned(rental: Rental) {
    setReturning(rental.id);
    const today = new Date().toISOString().slice(0, 10);

    const { error: rentalError } = await supabase
      .from("rentals")
      .update({ date_retour_reelle: today, statut: "terminee" })
      .eq("id", rental.id);

    if (rentalError) {
      setError(rentalError.message);
      setReturning(null);
      return;
    }

    const itemIds = (rental.rental_items ?? []).map((ri) => ri.item_id);
    if (itemIds.length > 0) {
      const { error: itemsError } = await supabase
        .from("items")
        .update({ statut: "nettoyage" })
        .in("id", itemIds);
      if (itemsError) setError(itemsError.message);
    }

    await load();
    setReturning(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-primary-dark">Locations</h1>
        <Link
          href="/rentals/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Nouvelle location
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-foreground/60">Chargement...</p>
      ) : rentals.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucune location pour l&apos;instant.
        </p>
      ) : (
        <div className="space-y-3">
          {rentals.map((rental) => {
            const overdue = isOverdue(rental);
            return (
              <div
                key={rental.id}
                className={`rounded-lg border p-4 ${
                  overdue
                    ? "border-danger bg-danger-light/40"
                    : "border-border bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {rental.customer?.nom ?? "Cliente inconnue"}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {(rental.rental_items ?? [])
                        .map((ri) => ri.item?.reference)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <StatusBadge
                    status={overdue ? "en_retard" : rental.statut}
                    label={
                      overdue
                        ? "En retard"
                        : RENTAL_STATUS_LABELS[rental.statut]
                    }
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-foreground/70 sm:grid-cols-4">
                  <span>
                    Début :{" "}
                    {new Date(rental.date_debut).toLocaleDateString("fr-FR")}
                  </span>
                  <span>
                    Retour prévu :{" "}
                    {new Date(rental.date_fin_prevue).toLocaleDateString(
                      "fr-FR"
                    )}
                  </span>
                  <span>Prix : {rental.prix_total} €</span>
                  <span>
                    Caution : {rental.caution_montant} € (
                    {rental.caution_rendue ? "rendue" : "conservée"})
                  </span>
                </div>

                {rental.statut === "en_cours" && (
                  <button
                    onClick={() => markReturned(rental)}
                    disabled={returning === rental.id}
                    className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                  >
                    {returning === rental.id
                      ? "Enregistrement..."
                      : "Marquer le retour"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
