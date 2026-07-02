/* main.js — nur Verhalten (kein Inhalt):
   - Mobile-Navigation (Burger-Toggle)
   - Cookie-Banner (Einwilligung in localStorage)
   - Kontaktformular: clientseitiger Erfolgszustand (kein echtes Submit)
   - Buchungskalender: Datum- + Zeitauswahl
*/
(function () {
  "use strict";

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

  /* ─ Cookie-Banner ─────────────────────────────────────────────── */
  var banner = document.querySelector("[data-cookie-banner]");
  if (banner) {
    var KEY = "ls-cookie-consent";
    var stored = null;
    try { stored = window.localStorage.getItem(KEY); } catch (e) { stored = null; }
    if (!stored) { banner.hidden = false; }
    banner.querySelectorAll("[data-cookie-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        try { window.localStorage.setItem(KEY, btn.getAttribute("data-cookie-action")); } catch (e) {}
        banner.hidden = true;
      });
    });
  }

  /* ─ Kontaktformular (kontakt.html) ────────────────────────────── */
  var form = document.querySelector("[data-contact-form]");
  var formContainer = document.querySelector("[data-form-container]");
  var success = document.querySelector("[data-form-success]");
  if (form && formContainer && success) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      formContainer.hidden = true;
      success.hidden = false;
      success.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
