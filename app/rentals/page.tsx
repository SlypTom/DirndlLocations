"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { todayLocalStr } from "@/lib/dates";
import type { Rental } from "@/lib/types";
import { RENTAL_STATUS_LABELS } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

interface EditForm {
  date_debut: string;
  date_fin_prevue: string;
  prix_total: string;
}

export default function RentalsPage() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

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

  function startEdit(rental: Rental) {
    setError(null);
    setEditingId(rental.id);
    setEditForm({
      date_debut: rental.date_debut,
      date_fin_prevue: rental.date_fin_prevue,
      prix_total: String(rental.prix_total),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  function updateEditForm<K extends keyof EditForm>(key: K, value: string) {
    setEditForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function saveEdit(id: string) {
    if (!editForm) return;
    setSavingEdit(true);
    setError(null);
    const payload = {
      date_debut: editForm.date_debut,
      date_fin_prevue: editForm.date_fin_prevue,
      prix_total: Number(editForm.prix_total) || 0,
    };
    const { error } = await supabase
      .from("rentals")
      .update(payload)
      .eq("id", id);
    setSavingEdit(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRentals((cur) => cur.map((r) => (r.id === id ? { ...r, ...payload } : r)));
    cancelEdit();
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
            const isEditing = editingId === rental.id && editForm;
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
                      {rental.customer?.nom ?? "Client inconnu"}
                    </p>
                    <p className="text-sm text-foreground/60">
                      {(rental.rental_items ?? [])
                        .map((ri) => ri.item?.reference)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
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
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <label className="block text-xs font-medium">
                        Début
                        <input
                          type="date"
                          value={editForm.date_debut}
                          onChange={(e) =>
                            updateEditForm("date_debut", e.target.value)
                          }
                          className="input mt-1"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Retour prévu
                        <input
                          type="date"
                          value={editForm.date_fin_prevue}
                          onChange={(e) =>
                            updateEditForm("date_fin_prevue", e.target.value)
                          }
                          className="input mt-1"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Prix total (€)
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.prix_total}
                          onChange={(e) =>
                            updateEditForm("prix_total", e.target.value)
                          }
                          className="input mt-1"
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveEdit(rental.id)}
                        disabled={savingEdit}
                        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                      >
                        {savingEdit ? "Enregistrement..." : "Enregistrer"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="rounded-md px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-background"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-foreground/70 sm:grid-cols-3">
                      <span>
                        Début :{" "}
                        {new Date(rental.date_debut).toLocaleDateString(
                          "fr-FR"
                        )}
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
                      {!upcoming && (
                        <button
                          onClick={() => markReturned(rental)}
                          disabled={returning === rental.id}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60"
                        >
                          {returning === rental.id
                            ? "Enregistrement..."
                            : "Marquer le retour"}
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(rental)}
                        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent-light"
                      >
                        Modifier
                      </button>
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
