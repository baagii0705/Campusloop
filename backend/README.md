# Solio Spring Boot migration (work in progress)

This is a separate Java 21 / Spring Boot API, not yet a replacement for the production frontend.

## Run
Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in your environment (never commit private keys). Run `mvn spring-boot:run` from backend/.

Endpoints: GET /api/health and GET /api/listings (public listings only, subject to existing Supabase RLS). No service-role key is used. This API does not alter database tables.

## Migration gates before deleting legacy HTML
1. Implement and test complete UI using Lavender & Ink.
2. Preserve Supabase Auth sessions and enforce RLS for listings, chats, offers, reports, and notifications.
3. Implement listing CRUD, uploads, chat, search, Smart Match, favorites, notifications and admin actions.
4. Deploy Java backend to a Java-capable host; Vercel static frontend alone does not host a persistent Spring Boot server.
5. Validate mobile, auth, permissions, data parity and rollback in staging.
6. Only then remove legacy index.html from the production branch.
