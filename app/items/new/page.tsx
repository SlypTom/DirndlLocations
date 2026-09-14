"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function NewItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    reference: "",
    modele: "",
    taille: "",
    couleur: "",
    etat: "Bon état",
    prix_location: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.reference || !form.modele || !form.taille || !form.prix_location) {
      setError("Renseigne au moins la référence, le modèle, la taille et le prix.");
      return;
    }
    setError(null);
    setSaving(true);

    let photo_url: string | null = null;
    if (photo) {
      const path = `${Date.now()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("item-photos")
        .upload(path, photo);
      if (uploadError) {
        setError(
          `Photo non enregistrée (${uploadError.message}). Crée un bucket "item-photos" public dans Supabase, ou continue sans photo.`
        );
      } else {
        const { data } = supabase.storage
          .from("item-photos")
          .getPublicUrl(path);
        photo_url = data.publicUrl;
      }
    }

    const { error: insertError } = await supabase.from("items").insert({
      reference: form.reference,
      modele: form.modele,
      taille: form.taille,
      couleur: form.couleur,
      etat: form.etat,
      prix_location: Number(form.prix_location),
      photo_url,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/items");
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-heading text-3xl text-primary-dark">
        Ajouter un article
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Référence">
          <input
            value={form.reference}
            onChange={(e) => update("reference", e.target.value)}
            className="input"
            placeholder="DIR-014"
          />
        </Field>
        <Field label="Modèle">
          <input
            value={form.modele}
            onChange={(e) => update("modele", e.target.value)}
            className="input"
            placeholder="Dirndl Trachten vert bouteille"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Taille">
            <input
              value={form.taille}
              onChange={(e) => update("taille", e.target.value)}
              className="input"
              placeholder="M"
            />
          </Field>
          <Field label="Couleur">
            <input
              value={form.couleur}
              onChange={(e) => update("couleur", e.target.value)}
              className="input"
              placeholder="Vert bouteille"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="État">
            <input
              value={form.etat}
              onChange={(e) => update("etat", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Prix de location (€)">
            <input
              type="number"
              step="0.01"
              value={form.prix_location}
              onChange={(e) => update("prix_location", e.target.value)}
              className="input"
              placeholder="45"
            />
          </Field>
        </div>
        <Field label="Photo (optionnel)">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
        </Field>

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
          {saving ? "Enregistrement..." : "Enregistrer l'article"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
