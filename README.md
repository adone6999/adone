# AdOne website

The public marketing + legal site for **AdOne**, plus a hidden, OTP-gated
account-deletion dashboard. It's a **static site** — plain HTML/CSS/JS, no build
step, no framework, no dependencies. Drop the folder on any static host
(Render Static Site, Netlify, Cloudflare Pages, S3+CloudFront, Nginx, …).

## Structure

```
website/
├── index.html                 Landing page
├── contact.html               Contact Us (composes a mailto, no backend)
├── security.html              Security
├── compliance.html            Compliance
├── ipr-complaints.html        IPR Complaints
├── anti-spam-policy.html      Anti-spam Policy
├── terms-of-service.html      Terms of Service
├── privacy-policy.html        Privacy Policy
├── refund-policy.html         Refund Policy
├── trademark-policy.html      Trademark Policy
├── cookie-policy.html         Cookie Policy
├── gdpr-compliance.html       GDPR Compliance (+ how account deletion works)
├── abuse-policy.html          Abuse / Acceptable Use Policy
├── account/
│   └── delete.html            HIDDEN delete-account dashboard (not in any nav)
├── assets/
│   ├── styles.css             Design system (forest-green brand)
│   ├── site.js                Injects the shared header/footer + cookie banner
│   ├── config.js              ← EDIT THIS (contacts + API base URLs)
│   ├── delete.js              Delete-dashboard logic (OTP login → delete)
│   ├── logo-mark.svg          The "A" mark
│   └── favicon.svg            Browser-tab icon
└── robots.txt                 Disallows /account/
```

The header and footer are injected by `assets/site.js` from a single definition,
so navigation/legal links are edited in one place. Contact emails and company
details are read from `assets/config.js` via `data-config="…"` placeholders —
change them once and every page updates.

## 1. Configure `assets/config.js`

Set your real contact inboxes, legal entity name and address, and — critically —
the **deployed API base URLs** the delete dashboard calls:

```js
fieldersApiBase: "https://adone-fielders-api.onrender.com/api/v1",
centerApiBase:   "https://adone-center-api.onrender.com/api/v1",
```

These must include the `/api/v1` suffix and point at the running Go backends.

## 2. Allow the website origin in the backends (CORS)

The delete dashboard makes cross-origin calls to the Fielders/Center APIs, so each
backend must list this website's origin in `CORS_ALLOWED_ORIGINS` (comma-separated).
In `render.yaml` the Fielders and Center services currently have it blank — set it,
e.g.:

```
CORS_ALLOWED_ORIGINS = https://adone.in,https://www.adone.in
```

(The middleware already allows `POST`/`DELETE`, `Authorization`, `Content-Type`
and `X-Device-Id`, and sends credentials — no backend code change needed.)

## 3. The hidden delete dashboard — `/account/delete.html`

Not linked from any nav or footer and excluded via `robots.txt` + a `noindex`
meta tag. Reach it directly at `https://<your-domain>/account/delete.html`. Flow:

1. Choose **Fielder** or **Center**.
2. Enter the account phone number → receive a 6-digit OTP.
3. Verify the OTP (this authenticates you against that app's backend).
4. Review what will be removed, type `DELETE`, and confirm.

The backend performs an **anonymize-and-retain, role-scoped** deletion (see
`POST /me/delete` in each API and migration `000014_account_deletion`):
personal details are erased, the phone number is freed, an owner's listings are
taken down / an advertiser's open inquiries are closed, and de-identified deal
records are retained for legal/tax/audit. If the same phone is both a Fielder and
a Center account, deleting one side leaves the other intact; the row is fully
anonymized only when the last role is removed.

> The OTP is currently printed to the backend terminal (no SMS gateway in v1),
> matching the mobile apps' dev behaviour.

## Local preview

```
cd website
python3 -m http.server 8080
# open http://localhost:8080
```

For the delete dashboard to work locally, run the Fielders (`:8101`) and Center
(`:8102`) backends and keep the default localhost API URLs in `config.js`, or set
`CORS_ALLOWED_ORIGINS=http://localhost:8080` on those backends.

## Note on the legal pages

The policy pages are professionally structured and tailored to AdOne's actual
model (B2B OOH marketplace, no online payments, OTP auth, location privacy,
Indian intermediary rules). They are a strong starting point but should be
reviewed by qualified legal counsel before launch.
