import { supabase } from "@/lib/supabase/client";

export async function uploadItemPhoto(
  file: File
): Promise<{ url: string } | { error: string }> {
  const path = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from("item-photos")
    .upload(path, file);
  if (error) {
    return {
      error: `Photo non enregistrée (${error.message}). Crée un bucket "item-photos" public dans Supabase, ou continue sans photo.`,
    };
  }
  const { data } = supabase.storage.from("item-photos").getPublicUrl(path);
  return { url: data.publicUrl };
}
