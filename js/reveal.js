/* reveal.js — fade-up on scroll using IntersectionObserver.
   Mirrors the React Reveal component behaviour, vanilla. */
(function () {
  "use strict";

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("reveal--in");
    });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("reveal--in");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: "0px 0px -40px 0px"
  });

  document.querySelectorAll(".reveal").forEach(function (el) {
    var delay = el.getAttribute("data-reveal-delay");
    if (delay) {
      el.style.transitionDelay = delay + "ms";
    }
    observer.observe(el);
  });
})();
