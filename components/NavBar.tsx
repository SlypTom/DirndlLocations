"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/rentals", label: "Locations" },
  { href: "/items", label: "Articles" },
  { href: "/customers", label: "Clients" },
];

function NavLinks({
  pathname,
  onNavigate,
  className = "",
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <>
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${className} ${
              active
                ? "bg-primary text-white"
                : "text-foreground hover:bg-accent-light"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the mobile menu on navigation is intentional, not a derivable render value
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === "/login" || !session) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <span className="font-heading text-lg text-primary-dark">
          Dirndl Locations
        </span>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLinks pathname={pathname} />
          <button
            onClick={handleLogout}
            className="ml-2 rounded-md px-3 py-2 text-sm text-foreground/70 hover:bg-accent-light"
          >
            Déconnexion
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Ouvrir le menu"
          aria-expanded={menuOpen}
          className="rounded-md p-2 text-foreground hover:bg-accent-light sm:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 sm:hidden">
          <NavLinks
            pathname={pathname}
            onNavigate={() => setMenuOpen(false)}
            className="w-full"
          />
          <button
            onClick={handleLogout}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-foreground/70 hover:bg-accent-light"
          >
            Déconnexion
          </button>
        </nav>
      )}
    </header>
  );
}
