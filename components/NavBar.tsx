"use client";

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

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { session } = useAuth();

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
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-foreground hover:bg-accent-light"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="ml-2 rounded-md px-3 py-2 text-sm text-foreground/70 hover:bg-accent-light"
          >
            Déconnexion
          </button>
        </nav>
      </div>
    </header>
  );
}
