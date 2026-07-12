/**
 * One-time migration: move every course thumbnail currently on Supabase
 * Storage across to Bunny CDN Storage, and rewrite the URL stored on
 * courses.thumbnail_url so the app serves the new (cheap + fast) copy.
 *
 * Idempotent: rows whose thumbnail is already on Bunny (isBunnyPublicUrl)
 * are skipped, so re-running the script is safe.
 *
 * Env vars required (same ones the runtime uses):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   BUNNY_STORAGE_ZONE
 *   BUNNY_STORAGE_ACCESS_KEY
 *   BUNNY_STORAGE_REGION  (empty for Frankfurt)
 *   BUNNY_STORAGE_PULLZONE
 *
 * Usage (locally, once secrets are in .env.local):
 *   npx tsx scripts/migrate-thumbnails-to-bunny.ts
 *
 * Or dry-run to see what would happen without touching anything:
 *   npx tsx scripts/migrate-thumbnails-to-bunny.ts --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { uploadToBunny, isBunnyPublicUrl } from '../lib/bunny-storage';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  requireEnv('BUNNY_STORAGE_ZONE');
  requireEnv('BUNNY_STORAGE_ACCESS_KEY');
  requireEnv('BUNNY_STORAGE_PULLZONE');

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, slug, thumbnail_url')
    .not('thumbnail_url', 'is', null);
  if (error) throw error;

  console.log(`Found ${courses.length} courses with a thumbnail_url.`);
  if (DRY_RUN) console.log('DRY RUN — nothing will be uploaded or modified.\n');

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const course of courses) {
    const src = course.thumbnail_url as string;
    if (isBunnyPublicUrl(src)) {
      skipped++;
      console.log(`  ✓ skip ${course.slug} — already on Bunny`);
      continue;
    }

    try {
      // Strip any cache-busting query string so fetch hits the object
      // itself, not a signed URL variant.
      const cleanSrc = src.split('?')[0];
      const res = await fetch(cleanSrc);
      if (!res.ok) throw new Error(`fetch ${res.status}`);

      const contentType =
        res.headers.get('content-type')?.split(';')[0].trim() || 'image/jpeg';
      const ext = extFromContentType(contentType) || 'jpg';
      const bytes = await res.arrayBuffer();

      const objectPath = `course-thumbnails/${course.id}/cover.${ext}`;

      if (DRY_RUN) {
        console.log(
          `  → would upload ${course.slug} → ${objectPath} (${humanKb(bytes.byteLength)})`
        );
        migrated++;
        continue;
      }

      const { publicUrl } = await uploadToBunny({
        objectPath,
        bytes,
        contentType,
      });

      const busted = `${publicUrl}?v=${Date.now()}`;
      const { error: updErr } = await supabase
        .from('courses')
        .update({ thumbnail_url: busted })
        .eq('id', course.id);
      if (updErr) throw updErr;

      migrated++;
      console.log(`  ✓ migrated ${course.slug} → ${objectPath}`);
    } catch (err) {
      failed++;
      console.error(
        `  ✗ failed ${course.slug}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log('\n---');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  if (DRY_RUN) console.log('\n(dry run — re-run without --dry-run to apply)');
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env: ${name}`);
    process.exit(1);
  }
  return v;
}

function extFromContentType(mime: string): string | null {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  if (mime === 'image/gif') return 'gif';
  return null;
}

function humanKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
