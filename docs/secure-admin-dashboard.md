# Secure Admin Dashboard — implementation and deployment checklist

## Existing implementation
The production UI in `index.html` already has `adminPanel`, `adminNavBtn`, `openAdminPanel`, `updateAdminReport`, and `adminDeleteListing`. Do not duplicate it. The current `isCampusAdmin()` checks `session.user.app_metadata.sevgui_admin`, a Supabase-style field; Appwrite Account user objects use server-managed `labels` instead.

## Security requirements (fail closed)
1. Grant the `admin` label to the owner's Appwrite user **using a privileged server-side Appwrite Users API**, never browser code or an exposed API key. Do not put an admin email, user ID, API key, or secret in frontend code.
2. Use `session?.user?.labels?.includes('admin') === true` to control visibility of the existing admin UI. This is only a convenience check, **not authorization**.
3. Create an authenticated Appwrite Function for privileged moderation. Validate the caller identity from verified Appwrite execution context/session, then independently check the caller's `admin` label with the server-side Users API. Reject missing identity, missing label, unexpected action, and invalid input. Never trust a user ID, role, or label sent in the request body.
4. Move `adminDeleteListing` and `updateAdminReport` writes to the Function. Restrict collection permissions so ordinary users cannot delete other users' listings or update other users' reports. Keep ordinary listing owners' intended self-service operations working through appropriate document permissions.
5. Fetch admin-only report data through the Function or use tightly scoped Appwrite permissions. Avoid making private reports publicly readable to power the dashboard.
6. For user moderation, implement the Users API **only** inside the authenticated Function with a least-privilege API key. Require confirmation and audit logging for destructive operations.
7. Never expose private chats or message content to admins by default. If abuse reports require review, only expose the reported material under an explicit, documented moderation policy.
8. Implement pagination, loading/error states, safe DOM rendering, and audit logs. Preserve the existing `index.html` app and mobile Capacitor build.

## Verification before production
- Signed-out visitor: cannot read private reports or call moderation endpoints.
- Signed-in non-admin: cannot read private reports, update report status, or delete another user's listing, including by direct API requests.
- Admin: can view the dashboard, review reports, and moderate listings.
- Removing the `admin` label revokes access after a fresh authenticated check.
- Tests and build pass; preview deploy is manually reviewed before merging.
- Appwrite permissions, Function deployment, and admin-label assignment are verified in the Appwrite console.

**Important:** Do not ship a frontend-only admin fix as a security fix. Until the server-side checks and permissions are deployed, privileged moderation must remain unavailable.
