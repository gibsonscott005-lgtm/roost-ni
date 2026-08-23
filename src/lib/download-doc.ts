import { supabase } from "@/integrations/supabase/client";

export async function downloadStoredDoc(path: string, filename?: string) {
  const { data, error } = await supabase.storage.from("tenancy-documents").createSignedUrl(path, 120);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Could not create signed URL");
  }

  const response = await fetch(data.signedUrl);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? path.split("/").pop() ?? "document.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
