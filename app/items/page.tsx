"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { Item, ItemStatus } from "@/lib/types";
import { ITEM_STATUS_LABELS } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import ItemPhoto from "@/components/ItemPhoto";

const STATUS_OPTIONS: ItemStatus[] = [
  "disponible",
  "loue",
  "nettoyage",
  "reparation",
];

type ViewMode = "list" | "grid";

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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

      <div className="flex items-center gap-3">
        <input
          type="search"
          placeholder="Rechercher par référence, modèle, taille, couleur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1"
        />
        <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      </div>

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
      ) : viewMode === "list" ? (
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
                <tr
                  key={item.id}
                  onClick={() => router.push(`/items/${item.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-background/60"
                >
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-3">
                      <ItemPhoto
                        url={item.photo_url}
                        alt={item.reference}
                        className="h-10 w-10 shrink-0 rounded-md border border-border"
                      />
                      {item.reference}
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.modele}</td>
                  <td className="px-4 py-3">{item.taille}</td>
                  <td className="px-4 py-3">{item.couleur}</td>
                  <td className="px-4 py-3">{item.prix_location} €</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/items/${item.id}`}
              className="overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-md"
            >
              <ItemPhoto
                url={item.photo_url}
                alt={item.reference}
                className="aspect-square w-full"
              />
              <div className="space-y-1 p-3">
                <p className="font-medium">{item.reference}</p>
                <p className="truncate text-xs text-foreground/60">
                  {item.modele}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <StatusBadge
                    status={item.statut}
                    label={ITEM_STATUS_LABELS[item.statut]}
                  />
                  <span className="text-sm font-medium">
                    {item.prix_location} €
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-md border border-border bg-surface p-0.5">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="Vue liste"
        aria-pressed={mode === "list"}
        className={`rounded px-2 py-1.5 ${
          mode === "list"
            ? "bg-primary text-white"
            : "text-foreground/60 hover:text-foreground"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Vue galerie"
        aria-pressed={mode === "grid"}
        className={`rounded px-2 py-1.5 ${
          mode === "grid"
            ? "bg-primary text-white"
            : "text-foreground/60 hover:text-foreground"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <rect x="4" y="4" width="7" height="7" rx="1" />
          <rect x="13" y="4" width="7" height="7" rx="1" />
          <rect x="4" y="13" width="7" height="7" rx="1" />
          <rect x="13" y="13" width="7" height="7" rx="1" />
        </svg>
      </button>
    </div>
  );
}
