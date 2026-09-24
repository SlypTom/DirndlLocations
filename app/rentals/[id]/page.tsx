"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { todayLocalStr } from "@/lib/dates";
import type { Rental } from "@/lib/types";
import RentalForm, { type RentalFormPayload } from "@/components/RentalForm";

export default function RentalDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("rentals")
        .select("*, rental_items(item_id)")
        .eq("id", params.id)
        .maybeSingle();
      if (error) setError(error.message);
      else if (!data) setNotFound(true);
      else setRental(data as unknown as Rental);
      setLoading(false);
    }
    load();
  }, [params.id]);

  async function handleSubmit(payload: RentalFormPayload) {
    if (!rental) return;
    const { error } = await supabase.rpc("update_rental", {
      p_rental_id: rental.id,
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

  if (loading) {
    return <p className="text-sm text-foreground/60">Chargement...</p>;
  }

  if (notFound || !rental) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-foreground/60">
          {error || "Location introuvable."}
        </p>
        <Link href="/rentals" className="text-sm text-primary hover:underline">
          &larr; Retour aux locations
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/rentals" className="text-sm text-primary hover:underline">
        &larr; Retour aux locations
      </Link>

      <h1 className="font-heading text-3xl text-primary-dark">
        Modifier la location
      </h1>

      <RentalForm
        initialValues={{
          customerId: preselectedCustomerId ?? rental.customer_id,
          dateDebut: rental.date_debut,
          dateFin: rental.date_fin_prevue,
          prixTotal: String(rental.prix_total),
          itemIds: (rental.rental_items ?? []).map((ri) => ri.item_id),
        }}
        excludeRentalId={rental.id}
        newCustomerReturnTo={`/rentals/${rental.id}`}
        submitLabel="Enregistrer les modifications"
        savingLabel="Enregistrement..."
        onSubmit={handleSubmit}
        extraActions={
          <Link
            href="/rentals"
            className="rounded-md px-4 py-2 text-sm font-medium text-foreground/70 hover:bg-background"
          >
            Annuler
          </Link>
        }
      />
    </div>
  );
}
