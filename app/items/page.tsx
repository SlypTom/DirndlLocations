"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Item, ItemStatus } from "@/lib/types";
import { ITEM_STATUS_LABELS } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";

const STATUS_OPTIONS: ItemStatus[] = [
  "disponible",
  "loue",
  "nettoyage",
  "reparation",
];

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .order("reference");
      if (error) setError(error.message);
      else setItems(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function updateStatus(id: string, statut: ItemStatus) {
    const previous = items;
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, statut } : i)));
    const { error } = await supabase
      .from("items")
      .update({ statut })
      .eq("id", id);
    if (error) {
      setItems(previous);
      setError(error.message);
    }
  }

  const filtered = items.filter((item) =>
    `${item.reference} ${item.modele} ${item.taille} ${item.couleur}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-primary-dark">Articles</h1>
        <Link
          href="/items/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Ajouter un article
        </Link>
      </div>

      <input
        type="search"
        placeholder="Rechercher par référence, modèle, taille, couleur..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {error && (
        <p className="rounded-md bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-foreground/60">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-foreground/60">
          Aucun article pour l&apos;instant.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-foreground/60">
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Modèle</th>
                <th className="px-4 py-3 font-medium">Taille</th>
                <th className="px-4 py-3 font-medium">Couleur</th>
                <th className="px-4 py-3 font-medium">Prix</th>
                <th className="px-4 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{item.reference}</td>
                  <td className="px-4 py-3">{item.modele}</td>
                  <td className="px-4 py-3">{item.taille}</td>
                  <td className="px-4 py-3">{item.couleur}</td>
                  <td className="px-4 py-3">{item.prix_location} €</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={item.statut}
                        label={ITEM_STATUS_LABELS[item.statut]}
                      />
                      <select
                        value={item.statut}
                        onChange={(e) =>
                          updateStatus(item.id, e.target.value as ItemStatus)
                        }
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {ITEM_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
