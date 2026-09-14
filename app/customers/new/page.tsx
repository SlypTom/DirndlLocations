"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function NewCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nom) {
      setError("Le nom est obligatoire.");
      return;
    }
    setError(null);
    setSaving(true);
    const { error: insertError } = await supabase.from("customers").insert({
      nom: form.nom,
      telephone: form.telephone || null,
      email: form.email || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/customers");
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-heading text-3xl text-primary-dark">
        Ajouter une cliente
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Nom
          <input
            value={form.nom}
            onChange={(e) => update("nom", e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block text-sm font-medium">
          Téléphone
          <input
            value={form.telephone}
            onChange={(e) => update("telephone", e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="input mt-1"
          />
        </label>
        <label className="block text-sm font-medium">
          Notes
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="input mt-1"
            rows={3}
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
          {saving ? "Enregistrement..." : "Enregistrer la cliente"}
        </button>
      </form>
    </div>
  );
}
