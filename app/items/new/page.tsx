"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import ItemForm, { type ItemFormPayload } from "@/components/ItemForm";

export default function NewItemPage() {
  const router = useRouter();

  async function handleSubmit(payload: ItemFormPayload) {
    const { error } = await supabase.from("items").insert(payload);
    if (error) return error.message;
    router.push("/items");
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="font-heading text-3xl text-primary-dark">
        Ajouter un article
      </h1>

      <ItemForm
        initialValues={{
          reference: "",
          modele: "",
          categorie: "dirndl",
          taille: "",
          couleur: "",
          etat: "Bon état",
          prix_location: "",
        }}
        submitLabel="Enregistrer l'article"
        savingLabel="Enregistrement..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
