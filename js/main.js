/* ============================================================
   PORTFOLIO — small, dependency-free interactions
   - sticky nav shadow + active section highlighting
   - mobile menu toggle
   - subtle reveal-on-scroll (honours reduced motion via CSS)
   - current year in the footer
   - contact form (placeholder handler)
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Sticky nav shadow ---------- */
  var header = document.getElementById("site-header");
  var onScroll = function () {
    if (header) header.classList.toggle("scrolled", window.scrollY > 8);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var toggle = document.getElementById("nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close the menu after tapping a link (only on small screens)
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        menu.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Reveal-on-scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- Image fallback ----------
     Each <img> in index.html targets your real photo (hero-photo.jpg,
     portrait.jpg, projects/project-*.jpg). Until you drop those files in,
     they silently fall back to the matching placeholder .svg so the layout
     never shows a broken image. Drop your files and it just works. */
  document.querySelectorAll("img[data-fallback]").forEach(function (img) {
    img.addEventListener("error", function () {
      if (img.src.indexOf(img.getAttribute("data-fallback")) !== -1) return;
      img.src = img.getAttribute("data-fallback");
    });
  });

  /* ---------- Contact form ----------
     {{PLACEHOLDER}}: this demo just shows a confirmation message.
     To really receive enquiries, hook it to a service such as Formspree
     (https://formspree.io) and uncomment the fetch() below. */
  var form = document.getElementById("contact-form");
  var note = document.getElementById("form-note");
  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      note.hidden = false;
      form.reset();

      /* ------------------------------------------------------------
         {PLACEHOLDER}: FORM BACKEND EXAMPLE (Formspree)
         Replace YOUR_FORM_ID with your real id, then remove the
         note.hidden = false  from the submit handler above and paste:

         var data = new FormData(form);
         fetch("https://formspree.io/f/YOUR_FORM_ID", {
           method: "POST",
           body: data,
           headers: { "Accept": "application/json" }
         })
           .then(function (r) { if (r.ok) { note.hidden = false; form.reset(); } })
           .catch(function () { note.textContent = "Something went wrong - email me directly instead."; note.hidden = false; });
         ------------------------------------------------------------ */
    });
  }
})();