import { getMobileUser, jsonError, unauthorized } from '@/lib/mobile-auth';
import { DELETION_WARNING_AR, deleteUserAccount } from '@/lib/account-deletion';

export const dynamic = 'force-dynamic';

/**
 * What the app shows on the confirmation sheet. Served rather than
 * hardcoded so the warning can be corrected without an app release.
 */
export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();
  return Response.json({ warnings: DELETION_WARNING_AR });
}

/**
 * Delete the caller's own account. Required in-app by App Store
 * guideline 5.1.1(v).
 *
 * The user id comes from the verified bearer token and nowhere else —
 * there is no `user_id` field in the body, so this endpoint physically
 * cannot be aimed at somebody else's account.
 *
 * `confirm: "DELETE"` is required in the body so a stray DELETE request
 * (a retried fetch, a misrouted call) can't wipe an account by accident.
 */
export async function DELETE(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  let body: { confirm?: string } = {};
  try {
    body = await request.json();
  } catch {
    // Empty body — falls through to the confirm check below.
  }

  if (body.confirm !== 'DELETE') {
    return jsonError('محتاجين تأكيد الحذف.', 400, 'confirmation_required');
  }

  const result = await deleteUserAccount(user.id);
  if (!result.ok) return jsonError(result.error, 400, 'deletion_failed');

  return Response.json({ ok: true });
}
