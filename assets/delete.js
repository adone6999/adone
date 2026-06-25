/* =============================================================================
   AdOne — account-deletion dashboard.
   Standalone OTP-login → confirm → delete flow. Talks directly to the deployed
   Fielders / Center Go APIs (base URLs in config.js). No data is persisted to
   localStorage except a stable device id (for OTP rate-limiting); the access
   token lives only in memory for the duration of the flow.
   ============================================================================= */
(function () {
  "use strict";

  var CFG = window.ADONE_CONFIG || {};
  var APPS = {
    fielders: { base: CFG.fieldersApiBase, label: "space owner", role: "Owner", other: "Advertiser", otherLabel: "advertiser" },
    center:   { base: CFG.centerApiBase,   label: "advertiser",  role: "Advertiser", other: "Owner", otherLabel: "space-owner" },
  };

  // ---- session state (in-memory only) ----
  var S = { app: null, phone: "", access: "", refresh: "", user: null };

  // ---- device id (persisted; matches the apps' X-Device-Id convention) ----
  function deviceId() {
    var KEY = "adone_device_id", id;
    try { id = localStorage.getItem(KEY); } catch (e) {}
    if (!id) {
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID()
        : "web-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e9).toString(36);
      try { localStorage.setItem(KEY, id); } catch (e) {}
    }
    return id;
  }

  // ---- DOM helpers ----
  function $(sel, root) { return (root || document).querySelector(sel); }
  function stepEl(name) { return $('[data-step="' + name + '"]'); }
  var STEPS = ["choose", "phone", "otp", "confirm", "done"];
  var DOT_STEPS = ["choose", "phone", "otp", "confirm"];

  function show(step) {
    STEPS.forEach(function (s) { var el = stepEl(s); if (el) el.hidden = s !== step; });
    var dots = $("#dots").children, idx = DOT_STEPS.indexOf(step);
    for (var i = 0; i < dots.length; i++) dots[i].className = i <= idx && idx >= 0 ? "on" : "";
    $("#dots").style.display = step === "done" ? "none" : "";
    hideAlert();
    var focusable = stepEl(step) && stepEl(step).querySelector("input, button:not(.dash-back)");
    if (focusable) try { focusable.focus(); } catch (e) {}
  }

  var alertEl;
  function showAlert(msg, kind) {
    alertEl.textContent = msg;
    alertEl.className = "alert " + (kind || "err");
    alertEl.hidden = false;
  }
  function hideAlert() { if (alertEl) alertEl.hidden = true; }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + (label ? " " + label : ""); }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }

  // ---- API ----
  function api(method, path, opts) {
    opts = opts || {};
    var headers = { "Content-Type": "application/json", "X-Device-Id": deviceId() };
    if (opts.auth) headers["Authorization"] = "Bearer " + S.access;
    if (!S.app || !APPS[S.app].base) return Promise.reject(friendly(0, "This deletion page is not configured. Please contact support."));
    return fetch(APPS[S.app].base + path, {
      method: method,
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
      if (res.status === 204) return { _status: 204 };
      return res.text().then(function (t) {
        var json = {};
        try { json = t ? JSON.parse(t) : {}; } catch (e) {}
        if (!res.ok) throw friendly(res.status, json && json.message, res.headers.get("Retry-After"));
        return json;
      });
    }, function () {
      // network / CORS failure
      throw friendly(-1, "We couldn't reach AdOne. Check your connection and try again.");
    });
  }

  function friendly(status, msg, retryAfter) {
    var e = new Error(msg || "Something went wrong.");
    e.status = status;
    if (status === 429) {
      var mins = retryAfter ? Math.max(1, Math.ceil(parseInt(retryAfter, 10) / 60)) : null;
      e.display = msg || ("Too many requests. Please try again" + (mins ? " in about " + mins + " minute(s)." : " later."));
    } else if (status === -1 || status === 0) {
      e.display = msg;
    } else {
      e.display = msg || "Something went wrong. Please try again.";
    }
    return e;
  }

  // ---- resend countdown ----
  var resendT;
  function startResendTimer() {
    var btn = $("#resendBtn"), lbl = $("#resendTimer"), left = 30;
    btn.disabled = true;
    clearInterval(resendT);
    lbl.textContent = " (" + left + "s)";
    resendT = setInterval(function () {
      left--;
      if (left <= 0) { clearInterval(resendT); btn.disabled = false; lbl.textContent = ""; }
      else lbl.textContent = " (" + left + "s)";
    }, 1000);
  }

  // ---- step flows ----
  function chooseApp(app) {
    S.app = app;
    if (!APPS[app].base) { showAlert("This page isn't configured yet (missing API URL). Please contact support."); }
    document.querySelectorAll("[data-app-label]").forEach(function (n) { n.textContent = APPS[app].label; });
    show("phone");
  }

  function sendOtp(isResend) {
    var phone = $("#phone").value.trim().replace(/[\s-]/g, "");
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      showAlert("Enter a valid phone number in international format, e.g. +919876543210.");
      return;
    }
    S.phone = phone;
    var btn = isResend ? $("#resendBtn") : $("#sendBtn");
    busy(btn, true, isResend ? "" : "Sending…");
    api("POST", "/auth/send-otp", { body: { phone: phone } })
      .then(function () {
        busy(btn, false);
        $("#otpPhone").textContent = phone;
        if (!isResend) show("otp");
        else showAlert("A new code is on its way.", "ok");
        startResendTimer();
      })
      .catch(function (e) { busy(btn, false); showAlert(e.display); });
  }

  function verifyOtp() {
    var code = $("#code").value.trim();
    if (!/^\d{6}$/.test(code)) { showAlert("Enter the 6-digit code we sent you."); return; }
    var btn = $("#verifyBtn");
    busy(btn, true, "Verifying…");
    api("POST", "/auth/verify-otp", { body: { phone: S.phone, code: code } })
      .then(function (json) {
        busy(btn, false);
        var d = json.data || {};
        if (d.is_new_user || !d.access_token) {
          showAlert("We couldn't find an AdOne account for this number. There's nothing to delete.");
          return;
        }
        S.access = d.access_token;
        S.refresh = d.refresh_token || "";
        S.user = d.user || {};
        renderConfirm();
        show("confirm");
      })
      .catch(function (e) {
        busy(btn, false);
        if (e.status === 401) showAlert("That code is invalid or expired. Request a new one.");
        else if (e.status === 403) showAlert("This account has been suspended. Contact support for help.");
        else showAlert(e.display);
      });
  }

  function renderConfirm() {
    var u = S.user || {}, app = APPS[S.app];
    var roles = u.roles || [];
    var hasOther = roles.indexOf(app.other) !== -1;

    // Summary
    var rows = [
      ["Name", u.full_name || "—"],
      ["Phone", S.phone],
      ["Deleting", app.label],
    ];
    $("#summary").innerHTML = rows.map(function (r) {
      return '<div class="row"><span class="k">' + r[0] + '</span><span class="v">' + escapeHtml(r[1]) + "</span></div>";
    }).join("");

    // Consequences (role-aware)
    var items = [];
    if (S.app === "fielders") items.push("Remove all your ad-space listings from the marketplace");
    else items.push("Close all your open inquiries");
    items.push("Erase your " + (S.app === "fielders" ? "owner" : "advertiser") + " profile and business details");
    items.push("Sign you out on all your devices");
    if (hasOther) {
      items.push("Keep your " + app.otherLabel + " account active — only this side is removed");
    } else {
      items.push("Erase your name, email and contact details");
      items.push("Free your phone number so you can register fresh later");
    }
    $("#consequences").innerHTML = items.map(function (t) {
      return '<li><svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><span>' + escapeHtml(t) + "</span></li>";
    }).join("");
  }

  function doDelete() {
    var btn = $("#deleteBtn");
    busy(btn, true, "Deleting…");
    api("POST", "/me/delete", { auth: true, body: { confirm: true } })
      .then(function (json) {
        // best-effort: revoke the refresh token too
        if (S.refresh) { api("POST", "/auth/logout", { body: { refresh_token: S.refresh } }).catch(function () {}); }
        var d = (json && json.data) || {};
        $("#doneMsg").textContent = d.message || "Your account and personal details have been removed.";
        S = { app: S.app, phone: "", access: "", refresh: "", user: null }; // wipe tokens
        show("done");
      })
      .catch(function (e) {
        busy(btn, false);
        if (e.status === 401) showAlert("Your session expired. Please start again.");
        else showAlert(e.display);
      });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- wire up ----
  function init() {
    alertEl = $("#alert");

    document.querySelectorAll(".choice button[data-app]").forEach(function (b) {
      b.addEventListener("click", function () { chooseApp(b.getAttribute("data-app")); });
    });
    document.querySelectorAll("[data-back]").forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-back")); });
    });

    $("#phoneForm").addEventListener("submit", function (e) { e.preventDefault(); sendOtp(false); });
    $("#otpForm").addEventListener("submit", function (e) { e.preventDefault(); verifyOtp(); });
    $("#resendBtn").addEventListener("click", function () { sendOtp(true); });

    var confirmText = $("#confirmText"), deleteBtn = $("#deleteBtn");
    confirmText.addEventListener("input", function () {
      deleteBtn.disabled = confirmText.value.trim().toUpperCase() !== "DELETE";
    });
    deleteBtn.addEventListener("click", function () {
      if (confirmText.value.trim().toUpperCase() === "DELETE") doDelete();
    });

    show("choose");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
