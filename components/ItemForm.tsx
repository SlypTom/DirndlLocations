"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { deleteItemPhoto, uploadItemPhoto } from "@/lib/item-photos";
import ItemPhoto from "@/components/ItemPhoto";
import {
  ITEM_CATEGORIES,
  ITEM_CATEGORY_LABELS,
  type ItemCategory,
} from "@/lib/types";

export interface ItemFormValues {
  reference: string;
  modele: string;
  categorie: ItemCategory;
  taille: string;
  couleur: string;
  etat: string;
  prix_location: string;
}

export interface ItemFormPayload {
  reference: string;
  modele: string;
  categorie: ItemCategory;
  taille: string;
  couleur: string;
  etat: string;
  prix_location: number;
  photo_url: string | null;
}

export default function ItemForm({
  initialValues,
  initialPhotoUrl = null,
  submitLabel,
  savingLabel,
  onSubmit,
  extraActions,
}: {
  initialValues: ItemFormValues;
  initialPhotoUrl?: string | null;
  submitLabel: string;
  savingLabel: string;
  onSubmit: (payload: ItemFormPayload) => Promise<string | null | void>;
  extraActions?: ReactNode;
}) {
  const [form, setForm] = useState(initialValues);
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof ItemFormValues>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const photoPreview = useMemo(
    () => (photo ? URL.createObjectURL(photo) : initialPhotoUrl),
    [photo, initialPhotoUrl]
  );

  useEffect(() => {
    if (!photo || !photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photo, photoPreview]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.reference || !form.modele || !form.taille || !form.prix_location) {
      setError("Renseigne au moins la référence, le modèle, la taille et le prix.");
      return;
    }
    setError(null);
    setSaving(true);

    let photo_url = initialPhotoUrl;
    if (photo) {
      const result = await uploadItemPhoto(photo);
      if ("error" in result) {
        setSaving(false);
        setError(result.error);
        return;
      }
      photo_url = result.url;
    }

    const submitError = await onSubmit({
      reference: form.reference,
      modele: form.modele,
      categorie: form.categorie,
      taille: form.taille,
      couleur: form.couleur,
      etat: form.etat,
      prix_location: Number(form.prix_location),
      photo_url,
    });

    setSaving(false);
    if (submitError) {
      setError(submitError);
      return;
    }

    if (photo && initialPhotoUrl && initialPhotoUrl !== photo_url) {
      deleteItemPhoto(initialPhotoUrl);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Photo (optionnel)">
        <div className="flex flex-wrap items-center gap-4">
          <ItemPhoto
            url={photoPreview}
            alt={form.reference || "Aperçu de l'article"}
            className="h-20 w-20 shrink-0 rounded-md border border-border"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="max-w-full text-sm"
          />
        </div>
      </Field>
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
      <Field label="Catégorie">
        <select
          value={form.categorie}
          onChange={(e) => update("categorie", e.target.value)}
          className="input"
        >
          {ITEM_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {ITEM_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
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

      {error && (
        <p className="rounded-md bg-danger-light px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? savingLabel : submitLabel}
        </button>
        {extraActions}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
