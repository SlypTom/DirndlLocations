"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("nom");
      if (error) setError(error.message);
      else setCustomers(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = customers.filter((c) =>
    `${c.nom} ${c.telephone ?? ""} ${c.email ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-primary-dark">Clientes</h1>
        <Link
          href="/customers/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Ajouter une cliente
        </Link>
      </div>

      <input
        type="search"
        placeholder="Rechercher par nom, téléphone, email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input"
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
          Aucune cliente pour l&apos;instant.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {filtered.map((c) => (
            <div key={c.id} className="px-4 py-3 text-sm">
              <p className="font-medium">{c.nom}</p>
              <p className="text-foreground/60">
                {[c.telephone, c.email].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
