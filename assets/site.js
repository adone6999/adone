/* =============================================================================
   AdOne site chrome — injects the shared header + footer, handles the mobile
   nav, fills data-config placeholders, and manages the cookie banner.
   Header/footer live here ONCE so every page stays in sync.
   The hidden delete dashboard does not include the #siteHeader/#siteFooter
   placeholders, so this script no-ops there gracefully.
   ============================================================================= */
(function () {
  "use strict";
  var CFG = window.ADONE_CONFIG || {};

  // Primary nav (kept light); the full legal index lives in the footer.
  var NAV = [
    { href: "index.html", label: "Home" },
    { href: "security.html", label: "Security" },
    { href: "compliance.html", label: "Compliance" },
    { href: "privacy-policy.html", label: "Privacy" },
    { href: "contact.html", label: "Contact" },
  ];

  var FOOTER = [
    {
      title: "Company",
      links: [
        { href: "index.html", label: "Home" },
        { href: "contact.html", label: "Contact Us" },
        { href: "security.html", label: "Security" },
        { href: "compliance.html", label: "Compliance" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "terms-of-service.html", label: "Terms of Service" },
        { href: "privacy-policy.html", label: "Privacy Policy" },
        { href: "cookie-policy.html", label: "Cookie Policy" },
        { href: "refund-policy.html", label: "Refund Policy" },
      ],
    },
    {
      title: "Policies",
      links: [
        { href: "abuse-policy.html", label: "Abuse Policy" },
        { href: "anti-spam-policy.html", label: "Anti-spam Policy" },
        { href: "ipr-complaints.html", label: "IPR Complaints" },
        { href: "trademark-policy.html", label: "Trademark Policy" },
      ],
    },
    {
      title: "Your data & rights",
      links: [
        { href: "gdpr-compliance.html", label: "GDPR Compliance" },
        { href: "privacy-policy.html#your-rights", label: "Data & Privacy Rights" },
        { href: "contact.html", label: "Data Requests" },
      ],
    },
  ];

  var path = location.pathname.split("/").pop() || "index.html";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function navLinks(mobile) {
    return NAV.map(function (n) {
      var active = n.href === path ? " active" : "";
      return '<a href="' + n.href + '"' + (mobile ? "" : ' class="' + active.trim() + '"') + ">" + esc(n.label) + "</a>";
    }).join("");
  }

  function renderHeader(el) {
    el.className = "site-header";
    el.innerHTML =
      '<div class="container">' +
        '<div class="nav" id="navBar">' +
          '<a class="brand" href="index.html" aria-label="AdOne home">' +
            '<img src="assets/logo-mark.svg" alt="" width="30" height="30">' +
            '<span class="brand-name">AdOne</span>' +
          "</a>" +
          '<div class="nav-spacer"></div>' +
          '<nav class="nav-links" aria-label="Primary">' + navLinks(false) + "</nav>" +
          '<div class="nav-cta">' +
            '<a class="btn btn-primary" href="contact.html">Contact us</a>' +
          "</div>" +
          '<button class="nav-toggle" id="navToggle" aria-label="Toggle menu" aria-expanded="false">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
          "</button>" +
        "</div>" +
      "</div>" +
      '<nav class="nav-mobile" id="navMobile" aria-label="Mobile">' + navLinks(true) +
        '<a href="contact.html">Contact us</a>' +
      "</nav>";

    var toggle = el.querySelector("#navToggle");
    var bar = el.querySelector("#navBar");
    if (toggle && bar) {
      toggle.addEventListener("click", function () {
        var open = bar.classList.toggle("open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
  }

  function renderFooter(el) {
    el.className = "site-footer";
    var cols = FOOTER.map(function (c) {
      return '<div class="footer-col"><h4>' + esc(c.title) + "</h4><ul>" +
        c.links.map(function (l) { return '<li><a href="' + l.href + '">' + esc(l.label) + "</a></li>"; }).join("") +
        "</ul></div>";
    }).join("");
    el.innerHTML =
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<a class="brand" href="index.html"><img src="assets/logo-mark.svg" alt="" width="30" height="30"><span class="brand-name">AdOne</span></a>' +
            "<p>Outdoor advertising, made simple — for advertisers and space owners alike.</p>" +
          "</div>" + cols +
        "</div>" +
        '<div class="footer-bottom">' +
          "<span>© <span data-year></span> " + esc(CFG.brandName || "AdOne") + ". All rights reserved.</span>" +
          '<span>Made for out-of-home advertising in India.</span>' +
        "</div>" +
      "</div>";
  }

  function fillConfig() {
    document.querySelectorAll("[data-config]").forEach(function (n) {
      var key = n.getAttribute("data-config");
      var val = CFG[key];
      if (val == null) return;
      if (n.tagName === "A" && key.toLowerCase().indexOf("email") !== -1) {
        n.href = "mailto:" + val;
        if (!n.textContent.trim()) n.textContent = val;
      } else {
        n.textContent = val;
      }
    });
  }

  function setYear() {
    document.querySelectorAll("[data-year]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
  }

  function cookieBanner() {
    var KEY = "adone_cookie_consent";
    try { if (localStorage.getItem(KEY)) return; } catch (e) { return; }
    var bar = document.createElement("div");
    bar.className = "cookie";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Cookie notice");
    bar.innerHTML =
      "<p>We use a few essential cookies to keep AdOne secure and remember your preferences. See our " +
      '<a href="cookie-policy.html">Cookie Policy</a>.</p>' +
      '<div class="actions">' +
        '<button class="btn btn-ghost" id="ckDecline">Decline</button>' +
        '<button class="btn btn-primary" id="ckAccept">Accept</button>' +
      "</div>";
    document.body.appendChild(bar);
    function close(v) { try { localStorage.setItem(KEY, v); } catch (e) {} bar.remove(); }
    bar.querySelector("#ckAccept").addEventListener("click", function () { close("accepted"); });
    bar.querySelector("#ckDecline").addEventListener("click", function () { close("declined"); });
  }

  function init() {
    var h = document.getElementById("siteHeader");
    if (h) renderHeader(h);
    var f = document.getElementById("siteFooter");
    if (f) renderFooter(f);
    fillConfig();
    setYear();
    if (document.body.getAttribute("data-no-cookie") === null) cookieBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
