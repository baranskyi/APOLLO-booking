# Deploying APOLLO NEXT booking

The runbook for this deployment, on the club's own Cloudflare account. About
20 minutes, $0 on the free tier. Written in English deliberately: the UI is
Ukrainian, this page is for whoever operates the thing.

Order matters in two places, both called out below.

## 0. Before you start

You need: a Cloudflare account, the `Halvar` font files and
`wrangler.production.toml` from your private master copy (see
[PRIVATE.md](PRIVATE.md)), and access to the DNS for the domain email will be
sent from.

```bash
npm install
npx wrangler login
```

## 1. Create the three resources

```bash
npx wrangler d1 create apollo-booking
npx wrangler kv namespace create CACHE
npx wrangler r2 bucket create apollo-avatars
```

Each of the first two prints an id. Put them in `wrangler.production.toml`
(NOT in the tracked `wrangler.toml`, which stays a template):

```toml
[[d1_databases]]
binding = "DB"
database_name = "apollo-booking"
database_id = "<the id d1 create printed>"
migrations_dir = "migrations"

[[kv_namespaces]]
binding = "CACHE"
id = "<the id kv namespace create printed>"
```

R2 is referenced by name, so nothing to paste for it.

## 2. Set the two secrets

```bash
openssl rand -base64 32 | npx wrangler secret put ENCRYPTION_KEY_V1
openssl rand -base64 32 | npx wrangler secret put SIGNING_KEY
```

**Put both in the password manager before you move on.** `ENCRYPTION_KEY_V1`
decrypts the stored calendar refresh tokens: lose it and every host has to
reconnect their calendar. `SIGNING_KEY` signs guest manage links; losing it
kills every outstanding reschedule/cancel link in someone's inbox.

## 3. Set the vars

In `wrangler.production.toml`:

```toml
[vars]
BASE_URL = "https://apollo-booking.<your-subdomain>.workers.dev"  # step 4 fixes this
BRAND_NAME = "APOLLO NEXT"
FROM_EMAIL = "booking@<club-domain>"
FROM_NAME = "APOLLO NEXT"
SUPPORT_EMAIL = "<a real inbox someone reads>"
LEGAL_OPERATOR = "<the legal entity operating the club>"
TELEMETRY_ENABLED = "0"
SIGNUPS = "@<club-domain>"
```

`SIGNUPS` is worth setting **before the first deploy**, not after. An env var
pins the sign-up policy (the Admin page then shows it read-only), which means
there is never a window where a stranger who finds the URL can register. Use a
domain allowlist if staff mail is on one domain, or a comma-separated list of
exact addresses otherwise.

`LEGAL_OPERATOR` is named as the data controller on `/privacy` and `/terms`.
Google's OAuth verification checks it against a real legal entity, so a brand
name alone is not enough.

## 4. Migrate and deploy — twice

```bash
npm run migrate:prod
npm run deploy
```

The deploy prints the Worker URL. Put it in `BASE_URL` and **deploy again**.
The Worker hard-fails on the placeholder rather than minting emails full of
dead links, so this two-step is deliberate, not a quirk.

```bash
curl https://apollo-booking.<your-subdomain>.workers.dev/health   # {"ok":true,...}
```

`npm run deploy` runs `predeploy` first, which fails if the Halvar files are
missing — so a deploy can never silently ship the fallback font.

## 5. First admin

The **first account created becomes the admin**. So sign up yourself, right
after the deploy, before telling anyone the URL.

With `SIGNUPS` pinned to your domain there is no rush and no race, but you
still want the first account to be yours.

Email is not working yet, so sign in one of two ways: finish step 7 (Google)
first and use the Google button, or run `npx wrangler tail`, submit the login
form, and copy the magic link out of the log.

## 6. Email

Day one runs without a provider: with neither `RESEND_API_KEY` nor
`BREVO_API_KEY` set, every email is logged to `wrangler tail` instead of sent.
That is enough for a smoke test and nothing else — magic-link sign-in and
every booking confirmation depend on real mail.

Before any real guest books:

1. Add `<club-domain>` as a sending domain in Resend.
2. Publish the SPF, DKIM and DMARC records it gives you. If the domain's DNS
   is already on Cloudflare this is a few minutes.
3. `npx wrangler secret put RESEND_API_KEY`
4. Check `FROM_EMAIL` is on the verified domain.

## 7. Google Calendar

Identity and calendar are separate grants with separate redirect URIs — a host
signing in never hands over calendar access, and revoking one does not touch
the other.

In Google Cloud Console:

1. New project → enable the **Google Calendar API**.
2. OAuth consent screen: **Internal** if the club has Google Workspace,
   otherwise External plus test users (100 is plenty; the "unverified app"
   warning is fine for staff).
3. Credentials → OAuth client ID → Web application, with **both** redirect
   URIs:

```
https://<your-origin>/auth/google/callback?purpose=identity
https://<your-origin>/auth/google/callback?purpose=calendar
```

4. Then:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

**Microsoft is skipped.** With `MICROSOFT_CLIENT_ID`/`_SECRET` unset the
provider simply is not wired: the sign-in page renders no Microsoft button and
the calendars page offers no Microsoft connection. Nothing breaks. If the club
ever moves to Microsoft 365, the Entra app takes path-segment redirect URIs
(`/auth/microsoft/callback/identity` and `/callback/calendar`) because Entra
rejects query strings.

## 8. Custom domain

Do this after everything works on `workers.dev`.

Cloudflare dashboard → Workers & Pages → apollo-booking → Settings → Domains &
Routes → *Add custom domain*, e.g. `booking.<club-domain>`. The zone has to be
on Cloudflare DNS.

Then update `BASE_URL`, redeploy, and **add the new origin's redirect URIs to
the Google OAuth client**. Keep both origins registered while links with the
old one are still circulating.

## Verifying a real deployment

1. `/health` returns ok.
2. Sign up (first admin), check the Admin page shows the pinned sign-up policy.
3. Connect Google Calendar — exercises both redirect URIs. Pick which
   calendars to read and which one to write to.
4. Book yourself a slot from a phone, as a guest would:
   - the confirmation email arrives with an `.ics` attached
   - opening the `.ics` puts a Ukrainian event in the guest's calendar at the
     right Kyiv time
   - the event appears in the host's connected calendar
   - rescheduling from the manage link **moves** the event; it does not create
     a second one
   - cancelling removes it
5. Reminder cron: create a booking about 70 minutes out and watch
   `npx wrangler tail` around T-60. The cron runs every 5 minutes and fires
   each reminder in a single `[target, target+5min)` window, so it sends once.

## Upgrading

```bash
npx wrangler d1 export apollo-booking --remote --output=backups/apollo-$(date +%F).sql
git fetch upstream && git merge upstream/main
npm test && npm run typecheck
npm run migrate:prod && npm run deploy
```

Back up first, always. Merge and test locally — never `git pull` straight into
a deploy. Conflicts land in the translated files; see
[GLOSSARY-UA.md](GLOSSARY-UA.md).

## Configuration reference

| Name | Kind | Notes |
|---|---|---|
| `BASE_URL` | var | Public origin. Used in every emailed link and `.ics`. Startup fails on the placeholder. |
| `BRAND_NAME` | var | `APOLLO NEXT`. Titles, `og:site_name`, email footer. |
| `FROM_EMAIL` / `FROM_NAME` | var | Sender identity. Must be on the verified domain. |
| `SUPPORT_EMAIL` | var | Reply-to, and the address shown on legal pages. |
| `LEGAL_OPERATOR` | var | Data controller on `/privacy` and `/terms`. |
| `DEMO_BOOKING_PATH` | var | Optional. Adds a booking-page link to the front page. |
| `SIGNUPS` | var | `open`, `closed`, or a list of emails and `@domains`. Pins the policy. |
| `TELEMETRY_ENABLED` | var | Keep `0`. |
| `ENCRYPTION_KEY_V1` | secret | Required. base64, 32 bytes. |
| `ENCRYPTION_KEY_V2` | secret | Only during key rotation. |
| `SIGNING_KEY` | secret | Required. base64, 32 bytes. |
| `GOOGLE_CLIENT_ID` / `_SECRET` | secret | Calendar and identity. |
| `MICROSOFT_CLIENT_ID` / `_SECRET` | secret | Unset — see step 7. |
| `RESEND_API_KEY` | secret | Unset logs emails to `wrangler tail` instead. |

## Free tier

Everything above runs on Cloudflare's free tier. Two paid features degrade
rather than break:

- **Queues** — without them, emails and webhooks are delivered inline on the
  request instead of in the background.
- **D1 read replication** — without it, booking pages read the primary. Correct
  either way; just slower far from it.

## Troubleshooting

**Emails never arrive.** With no provider key set they are logged, not sent —
`npx wrangler tail`. With Resend configured, check the sending domain is
verified and `FROM_EMAIL` is on it.

**"Not found" on a booking page that should exist.** Check the event type is
active and the slug matches. Changing a slug moves every event type at once
and leaves no redirect.

**A host's calendar shows "needs reconnect".** The refresh token was revoked
or expired, or `ENCRYPTION_KEY_V1` changed. Reconnect from the calendars page.

**Pages render in the wrong font.** The Halvar files are missing from
`assets/fonts/`. See [PRIVATE.md](PRIVATE.md).

**Reminders do not fire.** Cron triggers only run on a deployed Worker, never
in `wrangler dev`.
