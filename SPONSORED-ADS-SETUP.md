# Solio sponsored bottom banner setup

This feature is disabled by default until an Appwrite collection exists and contains an active ad. No demo ads or payment claims are displayed.

## Appwrite setup (required)
In the existing Appwrite project, database ID `public`, create collection ID `sponsored_ads` with document security **disabled** and these attributes:
- `name`: string, size 100, required
- `image_url`: string, size 2048, required
- `target_url`: string, size 2048, required
- `active`: boolean, required, default false
- `start_at`: datetime, optional
- `end_at`: datetime, optional

Collection permissions: **Read: Any**; **Create, Update, Delete: label:admin only**. Never grant public write permissions. Admin users must have the `admin` label in Appwrite Auth. The browser admin UI is not a security boundary; Appwrite permissions must enforce access.

The feature reads up to 100 documents and filters active dates client-side. It rotates eligible ads every 9 seconds and refreshes once per minute. For larger ad inventories, add a server-side selection service. There is no billing, payment, click tracking, or impression tracking in this version.

## Usage
Log in as an admin, open the existing **Удирдлага** dashboard, and use the **Байгууллагын сурталчилгаа** section. Enter the business name, image URL, destination URL and optional dates. The mobile banner is fixed directly above the bottom navigation. It is dismissible and hidden when no active ads exist.

## Deployment
Merge the PR to the deployment branch after setting up the collection and testing on a phone. If Cloudflare Pages is linked to that branch, it can deploy automatically according to its configuration.
