import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gvrwofcnqakebirioxol.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cndvZmNucWFrZWJpcmlveG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzOTkzNjIsImV4cCI6MjEwNDk3NTM2Mn0.XXYNpR_8H8S5CM3ASigaXn2fw71GtbBEwQpkhQ9pKIo";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseAnonKey) {
  // Ne bloque pas le build : utile pour compiler avant d'avoir un projet
  // Supabase. Affiche un avertissement clair dans la console du navigateur.
  if (typeof window !== "undefined") {
    console.warn(
      "Variables Supabase manquantes. Copie .env.local.example vers .env.local et renseigne tes clés."
    );
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
