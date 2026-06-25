/* =============================================================================
   AdOne site configuration — EDIT THIS FILE for your deployment.
   Loaded before every page's script. Values are read by site.js (contact
   details, via data-config="...") and by delete.js (the API base URLs).
   ============================================================================= */
window.ADONE_CONFIG = {
  /* ---- Brand / company (shown across the legal pages via data-config) ---- */
  brandName: "AdOne",
  legalEntity: "AdOne (operated by your registered company name)",
  addressLine: "Bengaluru, Karnataka, India",
  jurisdiction: "Bengaluru, Karnataka, India",

  /* ---- Contact addresses (replace with your real inboxes) ---- */
  supportEmail: "adone.queries@gmail.com",
  privacyEmail: "adone.queries@gmail.com",
  legalEmail: "adone.queries@gmail.com",
  securityEmail: "adone.queries@gmail.com",
  abuseEmail: "adone.queries@gmail.com",
  iprEmail: "adone.queries@gmail.com",
  grievanceOfficer: "Grievance Officer",
  grievanceEmail: "adone.queries@gmail.com",

  /* ---- Account-deletion dashboard: deployed API base URLs ----
     These must point at your running Go backends and include /api/v1.
     The backend CORS_ALLOWED_ORIGINS must list this website's origin.
     Local dev examples are below; swap for your Render URLs in production, e.g.
       fieldersApiBase: "https://adone-fielders-api.onrender.com/api/v1",
       centerApiBase:   "https://adone-center-api.onrender.com/api/v1",          */
  fieldersApiBase: "http://adoneduck.duckdns.org:8101/api/v1",
  centerApiBase: "http://adoneduck.duckdns.org:8102/api/v1",
};
