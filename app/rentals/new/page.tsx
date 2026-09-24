"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { todayLocalStr } from "@/lib/dates";
import RentalForm, { type RentalFormPayload } from "@/components/RentalForm";

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

  async function handleSubmit(payload: RentalFormPayload) {
    const { error } = await supabase.rpc("create_rental", {
      p_customer_id: payload.customerId,
      p_date_debut: payload.dateDebut,
      p_date_fin_prevue: payload.dateFin,
      p_prix_total: payload.prixTotal,
      p_item_ids: payload.itemIds,
      p_today: todayLocalStr(),
    });

    if (error) return error.message;
    router.push("/rentals");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-heading text-3xl text-primary-dark">
        Nouvelle location
      </h1>

      <RentalForm
        initialValues={{
          customerId: preselectedCustomerId ?? "",
          dateDebut: todayLocalStr(),
          dateFin: todayLocalStr(),
          prixTotal: "",
          itemIds: [],
        }}
        newCustomerReturnTo="/rentals/new"
        submitLabel="Créer la location"
        savingLabel="Enregistrement..."
        onSubmit={handleSubmit}
      />
    </div>
  );
}
