/**
 * Supabase Storage helper for org-scoped file uploads.
 * All storage keys are prefixed org/{orgId}/ per CLAUDE.md rules.
 */
import { createSupabaseAdmin } from "./supabase-server";

const BUCKET = "photos";

/** Build an org-scoped storage key */
export function storageKey(
  orgId: string,
  jobId: string,
  type: "before" | "after",
  filename: string
): string {
  return `org/${orgId}/jobs/${jobId}/${type}_${Date.now()}_${filename}`;
}

/** Upload a file buffer to Supabase Storage */
export async function uploadPhoto(
  key: string,
  file: Buffer,
  contentType: string
): Promise<{ key: string; error?: string }> {
  const supabase = await createSupabaseAdmin();
  const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    contentType,
    upsert: false,
  });
  if (error) return { key, error: error.message };
  return { key };
}

/** Get a signed URL for viewing a photo (1 hour expiry) */
export async function getSignedUrl(key: string): Promise<string | null> {
  const supabase = await createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 3600);
  if (error || !data) return null;
  return data.signedUrl;
}

/** Get signed URLs for multiple keys */
export async function getSignedUrls(
  keys: string[]
): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const supabase = await createSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(keys, 3600);
  if (error || !data) return {};
  const result: Record<string, string> = {};
  for (const item of data) {
    if (item.signedUrl) {
      result[item.path ?? ""] = item.signedUrl;
    }
  }
  return result;
}
