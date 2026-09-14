const STYLES: Record<string, string> = {
  disponible: "bg-primary/10 text-primary-dark",
  loue: "bg-accent-light text-accent",
  nettoyage: "bg-foreground/10 text-foreground/70",
  reparation: "bg-danger-light text-danger",
  en_cours: "bg-accent-light text-accent",
  terminee: "bg-primary/10 text-primary-dark",
  annulee: "bg-foreground/10 text-foreground/70",
  en_retard: "bg-danger-light text-danger",
};

export default function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        STYLES[status] ?? "bg-foreground/10 text-foreground/70"
      }`}
    >
      {label}
    </span>
  );
}
