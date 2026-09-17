"use client";

import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { todayLocalStr } from "@/lib/dates";
import type { Customer, Item } from "@/lib/types";
import { ITEM_CATEGORY_LABELS, ITEM_STATUS_LABELS } from "@/lib/types";
import ItemPhoto from "@/components/ItemPhoto";
import StatusBadge from "@/components/StatusBadge";

interface OccupiedWindow {
  item_id: string;
  date_debut: string;
  date_fin_prevue: string;
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
  const [occupiedWindows, setOccupiedWindows] = useState<OccupiedWindow[]>([]);
  const [customerId, setCustomerId] = useState(preselectedCustomerId ?? "");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [dateDebut, setDateDebut] = useState(todayLocalStr());
  const [dateFin, setDateFin] = useState(todayLocalStr());
  const [prixOverride, setPrixOverride] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [customersRes, itemsRes, windowsRes] = await Promise.all([
        supabase.from("customers").select("*").order("nom"),
        supabase
          .from("items")
          .select("*")
          .in("statut", ["disponible", "loue"])
          .order("reference"),
        supabase
          .from("rental_items")
          .select("item_id, rentals!inner(date_debut, date_fin_prevue, statut)")
          .eq("rentals.statut", "en_cours"),
      ]);
      if (customersRes.data) setCustomers(customersRes.data);
      if (itemsRes.data) setAvailableItems(itemsRes.data);
      if (windowsRes.data) {
        setOccupiedWindows(
          (
            windowsRes.data as unknown as {
              item_id: string;
              rentals: { date_debut: string; date_fin_prevue: string };
            }[]
          ).map((w) => ({
            item_id: w.item_id,
            date_debut: w.rentals.date_debut,
            date_fin_prevue: w.rentals.date_fin_prevue,
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  const selectedItems = useMemo(
    () => availableItems.filter((i) => selectedItemIds.includes(i.id)),
    [availableItems, selectedItemIds]
  );

  const conflictingItemIds = useMemo(() => {
    if (!dateDebut || !dateFin) return new Set<string>();
    return new Set(
      occupiedWindows
        .filter((w) => w.date_debut <= dateFin && w.date_fin_prevue >= dateDebut)
        .map((w) => w.item_id)
    );
  }, [occupiedWindows, dateDebut, dateFin]);

  const filteredItems = useMemo(
    () =>
      availableItems
        .filter(
          (item) =>
            selectedItemIds.includes(item.id) ||
            !conflictingItemIds.has(item.id)
        )
        .filter((item) =>
          `${item.reference} ${item.modele} ${item.taille} ${item.couleur} ${ITEM_CATEGORY_LABELS[item.categorie]}`
            .toLowerCase()
            .includes(itemSearch.toLowerCase())
        ),
    [availableItems, itemSearch, selectedItemIds, conflictingItemIds]
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

    const { error: rpcError } = await supabase.rpc("create_rental", {
      p_customer_id: customerId,
      p_date_debut: dateDebut,
      p_date_fin_prevue: dateFin,
      p_prix_total: Number(displayedPrix) || suggestedTotal,
      p_item_ids: selectedItemIds,
      p_today: todayLocalStr(),
    });

    setSaving(false);

    if (rpcError) {
      setError(rpcError.message);
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

        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Articles disponibles</p>
            {selectedItems.length > 0 && (
              <p className="text-xs text-foreground/60">
                {selectedItems.length} sélectionné
                {selectedItems.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
          <p className="mt-0.5 text-xs text-foreground/60">
            Un article déjà loué reste réservable sur des dates libres — il
            apparaît alors avec son statut actuel.
          </p>

          {availableItems.length === 0 ? (
            <p className="mt-1 text-sm text-foreground/60">
              Aucun article disponible actuellement.
            </p>
          ) : (
            <>
              {selectedItems.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {selectedItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary-dark hover:bg-primary/20"
                    >
                      {item.reference}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}

              <input
                type="search"
                placeholder="Rechercher par référence, modèle, taille, couleur..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.preventDefault();
                }}
                className="input mt-2"
              />

              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2">
                {filteredItems.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-foreground/60">
                    Aucun article ne correspond à la recherche.
                  </p>
                ) : (
                  filteredItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent-light"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => toggleItem(item.id)}
                        />
                        <ItemPhoto
                          url={item.photo_url}
                          alt={item.reference}
                          className="h-8 w-8 shrink-0 rounded-md border border-border"
                        />
                        <span className="truncate">
                          {item.reference} — {item.modele} ({item.taille},{" "}
                          {item.couleur})
                        </span>
                        {item.statut !== "disponible" && (
                          <StatusBadge
                            status={item.statut}
                            label={ITEM_STATUS_LABELS[item.statut]}
                          />
                        )}
                      </span>
                      <span className="shrink-0 text-foreground/60">
                        {item.prix_location} €
                      </span>
                    </label>
                  ))
                )}
              </div>
            </>
          )}
        </div>

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
