import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Ne bloque pas le build : utile pour compiler avant d'avoir un projet
  // Supabase. Le client ci-dessous pointe vers une URL factice tant que les
  // vraies variables ne sont pas configurées (pas de fallback vers un vrai
  // projet, pour ne jamais se connecter à une base par erreur).
  if (typeof window !== "undefined") {
    console.warn(
      "Variables Supabase manquantes. Copie .env.local.example vers .env.local et renseigne tes clés."
    );
  }
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.invalid",
  supabaseAnonKey || "placeholder-anon-key"
);
