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

// Best-effort: failures are swallowed so a save/delete never fails just because cleanup couldn't.
export async function deleteItemPhoto(url: string): Promise<void> {
  const marker = "/storage/v1/object/public/item-photos/";
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = decodeURIComponent(url.slice(idx + marker.length));
  await supabase.storage.from("item-photos").remove([path]);
}
