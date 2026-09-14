"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Item, Rental } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { RENTAL_STATUS_LABELS } from "@/lib/types";

export default function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [overdue, setOverdue] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);

      const [itemsRes, rentalsRes] = await Promise.all([
        supabase.from("items").select("*"),
        supabase
          .from("rentals")
          .select("*, customer:customers(*)")
          .eq("statut", "en_cours")
          .lt("date_fin_prevue", today),
      ]);

      if (itemsRes.error || rentalsRes.error) {
        setError(
          itemsRes.error?.message ??
            rentalsRes.error?.message ??
            "Erreur de chargement."
        );
      } else {
        setItems(itemsRes.data ?? []);
        setOverdue(rentalsRes.data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const counts = {
    disponible: items.filter((i) => i.statut === "disponible").length,
    loue: items.filter((i) => i.statut === "loue").length,
    nettoyage: items.filter((i) => i.statut === "nettoyage").length,
    reparation: items.filter((i) => i.statut === "reparation").length,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-primary-dark">
          Tableau de bord
        </h1>
        <Link
          href="/rentals/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Nouvelle location
        </Link>
      </div>

      {error && (
        <p className="rounded-md bg-danger-light px-4 py-3 text-sm text-danger">
          {error} — vérifie que .env.local contient tes clés Supabase et que
          le schéma SQL a été exécuté.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Disponibles" value={counts.disponible} />
        <StatCard label="Loués" value={counts.loue} />
        <StatCard label="À nettoyer" value={counts.nettoyage} />
        <StatCard label="En réparation" value={counts.reparation} />
      </div>

      <div>
        <h2 className="font-heading text-xl text-primary-dark">
          Retours en retard
        </h2>
        {loading ? (
          <p className="mt-2 text-sm text-foreground/60">Chargement...</p>
        ) : overdue.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/60">
            Aucun retard, tout est à jour.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
            {overdue.map((rental) => (
              <Link
                key={rental.id}
                href="/rentals"
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-danger-light/40"
              >
                <span>
                  {rental.customer?.nom ?? "Cliente inconnue"} — retour prévu
                  le{" "}
                  {new Date(rental.date_fin_prevue).toLocaleDateString(
                    "fr-FR"
                  )}
                </span>
                <StatusBadge
                  status="en_retard"
                  label={RENTAL_STATUS_LABELS.en_cours}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-2xl font-semibold text-primary-dark">{value}</p>
      <p className="text-sm text-foreground/60">{label}</p>
    </div>
  );
}
