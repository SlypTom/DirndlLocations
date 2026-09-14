export type ItemStatus = "disponible" | "loue" | "nettoyage" | "reparation";
export type RentalStatus = "en_cours" | "terminee" | "annulee";

export interface Item {
  id: string;
  reference: string;
  modele: string;
  taille: string;
  couleur: string;
  etat: string;
  prix_location: number;
  statut: ItemStatus;
  photo_url: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface RentalItemRow {
  rental_id: string;
  item_id: string;
  prix_unitaire: number;
  item?: Item;
}

export interface Rental {
  id: string;
  customer_id: string;
  date_debut: string;
  date_fin_prevue: string;
  date_retour_reelle: string | null;
  caution_montant: number;
  caution_rendue: boolean;
  prix_total: number;
  statut: RentalStatus;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  rental_items?: RentalItemRow[];
}

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  disponible: "Disponible",
  loue: "Loué",
  nettoyage: "À nettoyer",
  reparation: "En réparation",
};

export const RENTAL_STATUS_LABELS: Record<RentalStatus, string> = {
  en_cours: "En cours",
  terminee: "Terminée",
  annulee: "Annulée",
};
