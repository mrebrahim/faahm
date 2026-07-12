/**
 * Bunny CDN Storage — helpers for uploading/deleting course thumbnails
 * on Bunny's cheap S3-alt object storage + serving them through Bunny's
 * global CDN pull zone.
 *
 * We picked Bunny over Supabase Storage for public assets because:
 *   - $0.005-0.03/GB egress (vs Supabase Pro $0.03/GB cached)
 *   - 200+ PoP CDN gets images to Saudi/Egypt fast
 *   - Storage is $0.01/GB/month (vs $0.021 on Supabase Pro)
 *
 * Env vars (add in Coolify → Environment):
 *   BUNNY_STORAGE_ZONE       zone name, e.g. "faahm-images"
 *   BUNNY_STORAGE_ACCESS_KEY zone password from Dashboard → FTP & API Access
 *   BUNNY_STORAGE_REGION     region prefix — "" for Frankfurt (DE, default),
 *                            "ny" for New York, "sg" for Singapore, etc.
 *   BUNNY_STORAGE_PULLZONE   CDN hostname, e.g. "faahm-images.b-cdn.net"
 *
 * A missing env var throws on first use rather than at import so the app
 * still boots when the migration isn't complete — old Supabase URLs
 * already stored on `courses.thumbnail_url` keep resolving via their
 * original supabase.co host.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} — Bunny storage not configured.`);
  return v;
}

function storageEndpoint(): string {
  const region = (process.env.BUNNY_STORAGE_REGION || '').trim();
  const zone = required('BUNNY_STORAGE_ZONE');
  // Bunny Storage endpoint pattern:
  //   Frankfurt (default): https://storage.bunnycdn.com/<zone>/<path>
  //   Other regions:       https://<region>.storage.bunnycdn.com/<zone>/<path>
  const host = region ? `${region}.storage.bunnycdn.com` : 'storage.bunnycdn.com';
  return `https://${host}/${encodeURIComponent(zone)}`;
}

export function bunnyPublicUrl(objectPath: string): string {
  const host = required('BUNNY_STORAGE_PULLZONE');
  const clean = objectPath.replace(/^\/+/, '');
  return `https://${host}/${clean}`;
}

/**
 * PUT an object into the Storage Zone. objectPath is the key inside the
 * zone (e.g. 'course-thumbnails/<id>/cover.jpg'). Returns the public CDN
 * URL callers persist on the DB row.
 */
export async function uploadToBunny(opts: {
  objectPath: string;
  bytes: ArrayBuffer | Uint8Array | Buffer;
  contentType: string;
}): Promise<{ publicUrl: string; objectPath: string }> {
  const key = required('BUNNY_STORAGE_ACCESS_KEY');
  const url = `${storageEndpoint()}/${encodeObjectPath(opts.objectPath)}`;

  const body =
    opts.bytes instanceof ArrayBuffer
      ? Buffer.from(opts.bytes)
      : opts.bytes instanceof Uint8Array
        ? Buffer.from(opts.bytes)
        : opts.bytes;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: key,
      'Content-Type': opts.contentType,
    },
    body: body as any,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Bunny upload failed (${res.status}): ${text || res.statusText}`
    );
  }

  return { publicUrl: bunnyPublicUrl(opts.objectPath), objectPath: opts.objectPath };
}

/**
 * DELETE an object. 404 is treated as success so callers can be idempotent.
 */
export async function deleteFromBunny(objectPath: string): Promise<void> {
  const key = required('BUNNY_STORAGE_ACCESS_KEY');
  const url = `${storageEndpoint()}/${encodeObjectPath(objectPath)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { AccessKey: key },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    console.warn(`[bunny] delete failed (${res.status}): ${text || res.statusText}`);
  }
}

/**
 * Whether a URL already points at our Bunny pull zone. Used by the
 * migration script to skip rows that are already on Bunny.
 */
export function isBunnyPublicUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const host = (process.env.BUNNY_STORAGE_PULLZONE || '').trim();
  if (!host) return false;
  return url.includes(host);
}

/**
 * Object keys can contain slashes for directory segments but each
 * segment should be URI-encoded so filenames with spaces / Arabic
 * characters upload correctly.
 */
function encodeObjectPath(objectPath: string): string {
  return objectPath
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}
