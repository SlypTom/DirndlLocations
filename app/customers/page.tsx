"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import type { Customer } from "@/lib/types";

interface EditForm {
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  notes: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    `${c.nom} ${c.telephone ?? ""} ${c.email ?? ""} ${c.adresse ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function startEdit(c: Customer) {
    setError(null);
    setEditingId(c.id);
    setEditForm({
      nom: c.nom,
      telephone: c.telephone ?? "",
      email: c.email ?? "",
      adresse: c.adresse ?? "",
      notes: c.notes ?? "",
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
    if (!editForm.nom) {
      setError("Le nom est obligatoire.");
      return;
    }
    setSavingEdit(true);
    setError(null);
    const payload = {
      nom: editForm.nom,
      telephone: editForm.telephone || null,
      email: editForm.email || null,
      adresse: editForm.adresse || null,
      notes: editForm.notes || null,
    };
    const { error } = await supabase
      .from("customers")
      .update(payload)
      .eq("id", id);
    setSavingEdit(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCustomers((cur) =>
      cur.map((c) => (c.id === id ? { ...c, ...payload } : c))
    );
    cancelEdit();
  }

  async function handleDelete(c: Customer) {
    if (
      !window.confirm(
        `Supprimer définitivement le client ${c.nom} ? Cette action est irréversible.`
      )
    )
      return;

    setDeletingId(c.id);
    setError(null);
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    setDeletingId(null);

    if (error) {
      if (error.code === "23503") {
        setError(
          "Impossible de supprimer ce client : il a des locations enregistrées."
        );
      } else {
        setError(error.message);
      }
      return;
    }
    setCustomers((cur) => cur.filter((x) => x.id !== c.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl text-primary-dark">Clients</h1>
        <Link
          href="/customers/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          Ajouter un client
        </Link>
      </div>

      <input
        type="search"
        placeholder="Rechercher par nom, téléphone, email, adresse..."
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
          Aucun client pour l&apos;instant.
        </p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-surface">
          {filtered.map((c) =>
            editingId === c.id && editForm ? (
              <div key={c.id} className="space-y-3 px-4 py-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="Nom">
                    <input
                      value={editForm.nom}
                      onChange={(e) => updateEditForm("nom", e.target.value)}
                      className="input"
                    />
                  </EditField>
                  <EditField label="Téléphone">
                    <input
                      value={editForm.telephone}
                      onChange={(e) =>
                        updateEditForm("telephone", e.target.value)
                      }
                      className="input"
                    />
                  </EditField>
                  <EditField label="Email">
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => updateEditForm("email", e.target.value)}
                      className="input"
                    />
                  </EditField>
                  <EditField label="Adresse">
                    <input
                      value={editForm.adresse}
                      onChange={(e) =>
                        updateEditForm("adresse", e.target.value)
                      }
                      className="input"
                    />
                  </EditField>
                </div>
                <EditField label="Notes">
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => updateEditForm("notes", e.target.value)}
                    className="input"
                    rows={2}
                  />
                </EditField>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => saveEdit(c.id)}
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
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{c.nom}</p>
                  <p className="text-foreground/60">
                    {[c.telephone, c.email, c.adresse].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => startEdit(c)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent-light"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    disabled={deletingId === c.id}
                    className="rounded-md border border-danger px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-light disabled:opacity-60"
                  >
                    {deletingId === c.id ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function EditField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
