/* main.js — nur Verhalten (kein Inhalt):
   - Mobile-Navigation (Burger-Toggle)
   - Cookie-Consent (Einwilligung in localStorage) -> gated: Google Analytics 4 + Google Maps
   - Kontaktformular: echter Versand (Web3Forms) mit Progressive Enhancement
   - Google Maps: Laden erst nach Einwilligung / Klick ("Karte laden")
   - Buchungskalender: Datum- + Zeitauswahl
*/
(function () {
  "use strict";

  /* ─ Konfiguration ─────────────────────────────────────────────── */
  // GA4 Mess-ID hier eintragen ("G-XXXXXXXXXX"). Leer lassen = Analytics deaktiviert.
  var GA_ID = "";

  /* ─ Mobile-Navigation ─────────────────────────────────────────── */
  var nav = document.querySelector("[data-nav]");
  var navToggle = document.querySelector("[data-nav-toggle]");
  if (nav && navToggle) {
    navToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav__link").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ─ Consent-gesteuerte Dienste ────────────────────────────────── */
  function loadAnalytics() {
    if (window.__gaLoaded || !GA_ID) return;
    window.__gaLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", GA_ID, { anonymize_ip: true });
  }

  function loadMaps() {
    document.querySelectorAll("[data-map]").forEach(function (map) {
      if (map.getAttribute("data-loaded")) return;
      var src = map.getAttribute("data-map-src");
      if (!src) return;
      var frame = document.createElement("iframe");
      frame.src = src;
      frame.loading = "lazy";
      frame.className = "map__frame";
      frame.title = "Google Maps — Jahnstr. 7, 63517 Rodenbach";
      frame.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
      frame.setAttribute("allowfullscreen", "");
      map.appendChild(frame);
      map.setAttribute("data-loaded", "1");
      var ph = map.querySelector("[data-map-placeholder]");
      if (ph) ph.hidden = true;
    });
  }

  function applyConsent(state) {
    if (state === "accepted") {
      loadAnalytics();
      loadMaps();
    }
  }

  /* ─ Cookie-Banner ─────────────────────────────────────────────── */
  var banner = document.querySelector("[data-cookie-banner]");
  var KEY = "ls-cookie-consent";
  function getConsent() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setConsent(v) {
    try { window.localStorage.setItem(KEY, v); } catch (e) {}
  }

  var consent = getConsent();
  if (banner) {
    if (!consent) { banner.hidden = false; }
    banner.querySelectorAll("[data-cookie-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = btn.getAttribute("data-cookie-action");
        setConsent(v);
        banner.hidden = true;
        applyConsent(v);
      });
    });
  }
  // Bereits erteilte Einwilligung beim Laden anwenden.
  if (consent) { applyConsent(consent); }

  // "Cookie-Einstellungen" (Footer / Cookies-Seite) -> Banner erneut zeigen.
  document.querySelectorAll("[data-cookie-settings]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      if (banner) { banner.hidden = false; banner.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    });
  });

  // "Karte laden" -> Maps nur für diese Ansicht laden (explizite Handlung = Einwilligung).
  document.querySelectorAll("[data-map-load]").forEach(function (b) {
    b.addEventListener("click", function () { loadMaps(); });
  });

  /* ─ Kontaktformular (kontakt.html) ────────────────────────────── */
  var form = document.querySelector("[data-contact-form]");
  var formContainer = document.querySelector("[data-form-container]");
  var success = document.querySelector("[data-form-success]");
  var errorBox = document.querySelector("[data-form-error]");
  if (form && formContainer && success) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (errorBox) errorBox.hidden = true;
      var btn = form.querySelector("[type=submit]");
      if (btn) btn.disabled = true;
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            return { ok: r.ok && j.success !== false, data: j };
          });
        })
        .then(function (res) {
          if (!res.ok) throw new Error("submit failed");
          formContainer.hidden = true;
          success.hidden = false;
          success.scrollIntoView({ behavior: "smooth", block: "nearest" });
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          if (errorBox) {
            errorBox.hidden = false;
            errorBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
    });
  }

  /* ─ Kalender (buchung.html) ───────────────────────────────────── */
  var calendar = document.querySelector("[data-calendar]");
  if (!calendar) return;

  var slotsBlock = calendar.querySelector("[data-calendar-slots]");
  var slotsLabel = calendar.querySelector("[data-calendar-slots-label]");
  var timeButtons = calendar.querySelectorAll("[data-calendar-time]");
  var confirmBlock = calendar.querySelector("[data-calendar-confirm]");
  var confirmSummary = calendar.querySelector("[data-calendar-summary]");

  var selectedDay = null;
  var selectedTime = null;

  function syncSummary() {
    if (selectedDay && selectedTime && confirmSummary) {
      confirmSummary.textContent = selectedDay + ". Mai 2026 · " + selectedTime + " Uhr";
      if (confirmBlock) confirmBlock.hidden = false;
    } else if (confirmBlock) {
      confirmBlock.hidden = true;
    }
  }

  calendar.querySelectorAll("[data-calendar-day]").forEach(function (dayBtn) {
    dayBtn.addEventListener("click", function () {
      if (dayBtn.classList.contains("calendar__day--muted")) return;
      if (!dayBtn.classList.contains("calendar__day--has")) return;

      calendar.querySelectorAll("[data-calendar-day]").forEach(function (other) {
        other.classList.remove("calendar__day--selected");
      });
      dayBtn.classList.add("calendar__day--selected");
      selectedDay = dayBtn.getAttribute("data-day");

      selectedTime = null;
      timeButtons.forEach(function (t) { t.classList.remove("calendar__time--active"); });

      if (slotsBlock) slotsBlock.hidden = false;
      if (slotsLabel) { slotsLabel.textContent = "Verfügbare Slots · " + selectedDay + ". Mai"; }
      syncSummary();
    });
  });

  timeButtons.forEach(function (timeBtn) {
    timeBtn.addEventListener("click", function () {
      timeButtons.forEach(function (t) { t.classList.remove("calendar__time--active"); });
      timeBtn.classList.add("calendar__time--active");
      selectedTime = timeBtn.getAttribute("data-time");
      syncSummary();
    });
  });
})();
