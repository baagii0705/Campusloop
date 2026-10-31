# Campusloop
Student marketplace in Mongolia

## Cloudflare Pages deployment

The website is a static Cloudflare Pages deployment. It does not contain a
Cloudflare Worker or a `wrangler.toml` configuration.

Configure the existing Pages project in Cloudflare (do not create a second
project) with:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js version: `20`
- Preview deployments: enabled for non-production branches and pull requests

Connect the existing `sol1o.me` custom domain to that Pages project. Verify the
domain is already attached before changing DNS. Cloudflare's native Git
integration should be enabled from the Pages project settings using the
`baagii0705/Campusloop` repository.

The repository workflow at `.github/workflows/validate.yml` runs lint
validation, static type-check validation, and the production build on every
branch push and pull request. Configure `main` branch protection to require
the `Validate website / validate` check before merging. Cloudflare Pages will
only receive merged production changes when that check passes.

The browser only uses public Appwrite identifiers already present in the
client configuration. Do not add Appwrite API keys, Cloudflare API tokens, or
other secrets to the repository. If future server-side secrets are needed,
store them as encrypted Cloudflare Pages environment variables separately for
Preview and Production.
