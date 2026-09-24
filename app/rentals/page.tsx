"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { todayLocalStr } from "@/lib/dates";
import type { Rental } from "@/lib/types";
import { RENTAL_STATUS_LABELS } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("rentals")
      .select("*, customer:customers(*), rental_items(*, item:items(*))")
      .eq("statut", "en_cours")
      .order("date_debut", { ascending: false });
    if (error) setError(error.message);
    else setRentals((data as unknown as Rental[]) ?? []);
    setLoading(false);
  }

  function isOverdue(rental: Rental) {
    const today = todayLocalStr();
    return rental.statut === "en_cours" && rental.date_fin_prevue < today;
  }

  function isUpcoming(rental: Rental) {
    return rental.date_debut > todayLocalStr();
  }

  async function markReturned(rental: Rental) {
    setReturning(rental.id);
    setError(null);
    const { error } = await supabase.rpc("complete_rental", {
      p_rental_id: rental.id,
      p_date_retour: todayLocalStr(),
    });
    setReturning(null);
    if (error) {
      setError(error.message);
      return;
    }
    await load();
  }

  async function cancelRental(rental: Rental) {
    if (
      !window.confirm(
        `Annuler la location de ${rental.customer?.nom ?? "ce client"} ? Les articles redeviendront disponibles.`
      )
    )
      return;

    setCancelling(rental.id);
    setError(null);
    const { error } = await supabase.rpc("cancel_rental", {
      p_rental_id: rental.id,
      p_today: todayLocalStr(),
    });
    setCancelling(null);
    if (error) {
      setError(error.message);
      return;
    }
    await load();
  }

  async function togglePaid(rental: Rental) {
    const previous = rentals;
    const paye = !rental.paye;
    setRentals((cur) => cur.map((r) => (r.id === rental.id ? { ...r, paye } : r)));
    const { error } = await supabase
      .from("rentals")
      .update({ paye })
      .eq("id", rental.id);
    if (error) {
      setRentals(previous);
      setError(error.message);
    }
  }

  async function toggleSorti(rental: Rental) {
    const previous = rentals;
    const sorti = !rental.sorti;
    setRentals((cur) => cur.map((r) => (r.id === rental.id ? { ...r, sorti } : r)));
    const { error } = await supabase
      .from("rentals")
      .update({ sorti })
      .eq("id", rental.id);
    if (error) {
      setRentals(previous);
      setError(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
            const upcoming = !overdue && isUpcoming(rental);
            return (
              <div
                key={rental.id}
                className={`rounded-lg border p-4 ${
                  overdue
                    ? "border-danger bg-danger-light/40"
                    : "border-border bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {rental.customer?.nom ?? "Client inconnu"}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {(rental.rental_items ?? [])
                        .map((ri) => ri.item?.reference)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge
                      status={overdue ? "en_retard" : upcoming ? "a_venir" : rental.statut}
                      label={
                        overdue
                          ? "En retard"
                          : upcoming
                          ? "À venir"
                          : RENTAL_STATUS_LABELS[rental.statut]
                      }
                    />
                    <button
                      onClick={() => togglePaid(rental)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        rental.paye
                          ? "bg-primary/10 text-primary-dark hover:bg-primary/20"
                          : "bg-danger-light text-danger hover:bg-danger-light/70"
                      }`}
                    >
                      {rental.paye ? "Payé" : "Non payé"}
                    </button>
                    <button
                      onClick={() => toggleSorti(rental)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        rental.sorti
                          ? "bg-primary/10 text-primary-dark hover:bg-primary/20"
                          : "bg-accent-light text-accent hover:bg-accent-light/70"
                      }`}
                    >
                      {rental.sorti ? "Sorti" : "Pas encore sorti"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-foreground/70 sm:grid-cols-3">
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
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => markReturned(rental)}
                    disabled={returning === rental.id}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                  >
                    {returning === rental.id
                      ? "Enregistrement..."
                      : "Marquer le retour"}
                  </button>
                  <Link
                    href={`/rentals/${rental.id}`}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent-light"
                  >
                    Modifier
                  </Link>
                  <button
                    onClick={() => cancelRental(rental)}
                    disabled={cancelling === rental.id}
                    className="rounded-md border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-light disabled:opacity-60"
                  >
                    {cancelling === rental.id
                      ? "Annulation..."
                      : "Annuler la location"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
