export default function ItemPhoto({
  url,
  alt,
  className = "",
}: {
  url: string | null;
  alt: string;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photo URLs come from a Supabase storage project only known at runtime
      <img src={url} alt={alt} className={`object-cover ${className}`} />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-background text-foreground/25 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-2/5 w-2/5"
      >
        <path
          d="M8 3 6 6H4a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2l-2-3H8Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
