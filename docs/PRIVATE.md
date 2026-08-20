# Private files

Two things this deployment needs are deliberately **not** in git, because this
repository is public. Neither is reconstructible from a clone — keep a master
copy somewhere you control (a private drive folder, or an attachment on the
password-manager entry that already holds the deploy secrets).

| File | What it is | Without it |
|---|---|---|
| `wrangler.production.toml` | The real config: D1/KV ids, `BASE_URL`, brand vars, custom domain | `npm run deploy` fails immediately — no resource ids to deploy against |
| `assets/fonts/halvar-400.woff2`<br>`assets/fonts/halvar-500.woff2` | Halvar Breitschrift, commercially licensed to APOLLO NEXT | `npm run predeploy` fails on purpose. If forced past it, pages render in Archivo / system-ui: legible, correctly laid out, not the brand |

## Why this works

`git` never touches either file, so `git pull`, `git merge upstream/main` and
branch switching leave them alone — upgrades are unaffected.

Wrangler uploads `[assets] directory = "./assets"` **from the local
filesystem** at deploy time, not from a commit, so the fonts ship to
Cloudflare without ever entering a commit.

## On a fresh clone

```bash
git clone https://github.com/baranskyi/APOLLO-booking.git apollo-booking
cd apollo-booking && npm install
# then copy in, from your private master copy:
#   wrangler.production.toml        -> repo root
#   halvar-400.woff2, halvar-500.woff2 -> assets/fonts/
npm run predeploy   # passes only once the fonts are in place
```

`npm run dev` works fine without either file — local development just runs on
the template config and the fallback font stack.

## Secrets

Secrets are neither in git nor in `wrangler.production.toml`. They live in
Cloudflare, set once with `wrangler secret put`:

- `ENCRYPTION_KEY_V1` — **losing this forces every host to reconnect their
  calendar**, because it decrypts the stored OAuth refresh tokens. Keep it in
  the password manager, not only in Cloudflare.
- `SIGNING_KEY` — HMAC for guest manage links. Losing it invalidates every
  outstanding reschedule/cancel link.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY` (or `BREVO_API_KEY`)
