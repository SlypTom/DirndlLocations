"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Customer, Item } from "@/lib/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function NewRentalPage() {
  return (
    <Suspense>
      <NewRentalForm />
    </Suspense>
  );
}

function NewRentalForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [customerId, setCustomerId] = useState(preselectedCustomerId ?? "");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [dateDebut, setDateDebut] = useState(todayStr());
  const [dateFin, setDateFin] = useState(todayStr());
  const [caution, setCaution] = useState("");
  const [prixOverride, setPrixOverride] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [customersRes, itemsRes] = await Promise.all([
        supabase.from("customers").select("*").order("nom"),
        supabase
          .from("items")
          .select("*")
          .eq("statut", "disponible")
          .order("reference"),
      ]);
      if (customersRes.data) setCustomers(customersRes.data);
      if (itemsRes.data) setAvailableItems(itemsRes.data);
      setLoading(false);
    }
    load();
  }, []);

  const selectedItems = useMemo(
    () => availableItems.filter((i) => selectedItemIds.includes(i.id)),
    [availableItems, selectedItemIds]
  );

  const suggestedTotal = useMemo(
    () => selectedItems.reduce((sum, i) => sum + Number(i.prix_location), 0),
    [selectedItems]
  );

  const displayedPrix =
    prixOverride ?? (suggestedTotal ? String(suggestedTotal) : "");

  function toggleItem(id: string) {
    setSelectedItemIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerId || selectedItemIds.length === 0 || !dateFin) {
      setError("Choisis un client, au moins un article et une date de retour.");
      return;
    }
    setError(null);
    setSaving(true);

    const { data: rental, error: rentalError } = await supabase
      .from("rentals")
      .insert({
        customer_id: customerId,
        date_debut: dateDebut,
        date_fin_prevue: dateFin,
        caution_montant: Number(caution) || 0,
        prix_total: Number(displayedPrix) || suggestedTotal,
        statut: "en_cours",
      })
      .select()
      .single();

    if (rentalError || !rental) {
      setError(rentalError?.message ?? "Erreur lors de la création.");
      setSaving(false);
      return;
    }

    const rentalItemsPayload = selectedItems.map((item) => ({
      rental_id: rental.id,
      item_id: item.id,
      prix_unitaire: item.prix_location,
    }));

    const { error: itemsLinkError } = await supabase
      .from("rental_items")
      .insert(rentalItemsPayload);

    const { error: statusError } = await supabase
      .from("items")
      .update({ statut: "loue" })
      .in("id", selectedItemIds);

    setSaving(false);

    if (itemsLinkError || statusError) {
      setError(itemsLinkError?.message ?? statusError?.message ?? "Erreur.");
      return;
    }

    router.push("/rentals");
  }

  if (loading) {
    return <p className="text-sm text-foreground/60">Chargement...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-3xl text-primary-dark">
        Nouvelle location
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block text-sm font-medium">
          Client
          <div className="mt-1 flex gap-2">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input"
            >
              <option value="">Sélectionner...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
            <Link
              href="/customers/new?returnTo=/rentals/new"
              className="whitespace-nowrap rounded-md border border-border px-3 py-2 text-sm hover:bg-accent-light"
            >
              + Nouveau
            </Link>
          </div>
        </label>

        <div>
          <p className="text-sm font-medium">Articles disponibles</p>
          {availableItems.length === 0 ? (
            <p className="mt-1 text-sm text-foreground/60">
              Aucun article disponible actuellement.
            </p>
          ) : (
            <div className="mt-1 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2">
              {availableItems.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent-light"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedItemIds.includes(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                    {item.reference} — {item.modele} ({item.taille},{" "}
                    {item.couleur})
                  </span>
                  <span className="text-foreground/60">
                    {item.prix_location} €
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            Date de début
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-medium">
            Retour prévu
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="input mt-1"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm font-medium">
            Caution (€)
            <input
              type="number"
              step="0.01"
              value={caution}
              onChange={(e) => setCaution(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm font-medium">
            Prix total (€)
            <input
              type="number"
              step="0.01"
              value={displayedPrix}
              onChange={(e) => setPrixOverride(e.target.value)}
              className="input mt-1"
              placeholder={String(suggestedTotal)}
            />
          </label>
        </div>

        {error && (
          <p className="rounded-md bg-danger-light px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : "Créer la location"}
        </button>
      </form>
    </div>
  );
}
