import 'server-only';
import { createServiceClient } from '@/lib/supabase/server';
import type { CatalogCourse } from './matching';

/**
 * Pull every published course with its RIASEC tags. Lives in its own
 * file (with the `server-only` guard) so client bundles never pick it
 * up by accident — the matcher's pure logic in matching.ts can be
 * imported from anywhere, but anything that hits the DB stays here.
 */
export async function loadCatalog(): Promise<CatalogCourse[]> {
  const service = createServiceClient();
  const { data } = await service
    .from('courses')
    .select(
      'id, slug, title_ar, short_description_ar, thumbnail_url, riasec, primary_driver, is_published'
    )
    .eq('is_published', true);
  return (data || []) as CatalogCourse[];
}
