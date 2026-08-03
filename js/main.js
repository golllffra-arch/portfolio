/* ============================================================
   PORTFOLIO — small, dependency-free interactions
   - sticky nav shadow + active section highlighting
   - mobile menu toggle
   - subtle reveal-on-scroll (honours reduced motion via CSS)
   - current year in the footer
   - contact form (Formspree when configured in the admin dashboard)
   ============================================================ */

(function () {
  "use strict";

  /* ============================================================
     CONFIG ENGINE — applies site-config.js (or the admin's
     localStorage override) to the page: texts, lists, images,
     theme colors, fonts. Run first, before everything else.
     ============================================================ */

  var STORE_KEY = "ms_portfolio_cfg_v1";

  function getCfg() {
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return window.SITE_CONFIG || {};
  }

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o == null ? undefined : o[Number.isNaN(+k) ? k : +k];
    }, obj);
  }

  function applyConfig(cfg) {
    /* texts */
    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      var val = getPath(cfg, el.getAttribute("data-cfg"));
      if (typeof val === "string" && val !== "") {
        el.textContent = val;
        /* honour line breaks (e.g. the hero badge label) */
        el.innerHTML = val.split("\n").join("<br />");
      }
    });

    /* mailto / link fields */
    document.querySelectorAll("[data-cfg-link]").forEach(function (el) {
      var val = getPath(cfg, el.getAttribute("data-cfg-link"));
      if (typeof val === "string" && val !== "") {
        el.textContent = val;
        el.setAttribute("href", val.indexOf("@") > -1 ? "mailto:" + val : val);
      }
    });

    /* single images (hero, portrait) */
    document.querySelectorAll("[data-img]").forEach(function (el) {
      var val = getPath(cfg, el.getAttribute("data-img"));
      if (typeof val === "string" && val !== "") el.setAttribute("src", val);
    });

    /* lists: process steps, projects, testimonials, services, stats */
    var esc = function (s) {
      return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    var linkEsc = function (s) { return esc(s).replace(/"/g, "&quot;"); };
    var icons = window.SITE_ICONS || {};

    function renderSteps(list) {
      var items = (cfg.process && cfg.process.steps) || [];
      list.innerHTML = items.map(function (s, i) {
        return '<li class="step">' +
          '<span class="step-num">' + esc(String(i + 1).padStart(2, "0")) + "</span>" +
          '<span class="step-icon" aria-hidden="true">' + (icons[s.icon] || "") + "</span>" +
          "<h3>" + esc(s.title) + "</h3>" +
          '<p class="step-duration">' + esc(s.duration) + "</p>" +
          "<p>" + esc(s.desc) + "</p>" +
          "</li>";
      }).join("");
    }

    function renderProjects(list) {
      var projects = (cfg.work && cfg.work.projects) || [];
      var labels = (cfg.work && cfg.work.labels) || { problem: "The problem", decisions: "Key decisions", result: "The result" };
      list.innerHTML = projects.map(function (p, i) {
        var fallback = "";
        if (p.image && p.image.indexOf("assets/") === 0) {
          var svgs = ["project-one.svg", "project-two.svg", "project-three.svg"];
          fallback = ' data-fallback="assets/img/projects/' + (svgs[i] || "project-one.svg") + '"';
        }
        return '<article class="case">' +
          '<div class="case-media reveal">' +
            '<img src="' + linkEsc(p.image) + '"' + fallback + ' alt="' + linkEsc(p.imageAlt) + '" loading="lazy" />' +
          "</div>" +
          '<div class="case-body reveal">' +
            '<p class="case-kicker">' + esc(p.kicker) + "</p>" +
            '<h3 class="case-title">' + esc(p.title) + "</h3>" +
            '<div class="case-block"><h4 class="case-label">' + esc(labels.problem) + "</h4>" +
              "<p>" + esc(p.problem) + "</p></div>" +
            '<div class="case-block"><h4 class="case-label">' + esc(labels.decisions) + "</h4>" +
              '<ul class="case-list">' + (p.decisions || []).map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul></div>" +
            '<div class="case-block"><h4 class="case-label">' + esc(labels.result) + "</h4>" +
              '<p class="case-result">' + esc(p.result) + "</p></div>" +
            '<a class="btn btn-ghost" href="' + linkEsc(p.link || "#") + '" target="_blank" rel="noopener">' +
              esc(p.linkLabel || "Visit live site") + ' <span aria-hidden="true">↗</span></a>' +
          "</div></article>";
      }).join("");
    }

    function renderTestimonials(list) {
      var items = (cfg.testimonials && cfg.testimonials.items) || [];
      list.innerHTML = items.map(function (t) {
        return '<article class="testimonial reveal">' +
          '<p class="testimonial-quote">"' + esc(t.quote) + '"</p>' +
          '<footer class="testimonial-author">' +
            '<span class="testimonial-name">' + esc(t.name) + "</span>" +
            '<span class="testimonial-role">' + esc(t.role) + "</span>" +
          "</footer></article>";
      }).join("");
    }

    function renderServices(list) {
      var items = (cfg.services && cfg.services.items) || [];
      list.innerHTML = items.map(function (s, i) {
        return '<article class="service reveal">' +
          '<span class="service-num">' + esc(String(i + 1).padStart(2, "0")) + "</span>" +
          '<span class="service-icon" aria-hidden="true">' + (icons[s.icon] || "") + "</span>" +
          "<h3>" + esc(s.title) + "</h3>" +
          "<p>" + esc(s.desc) + "</p>" +
          '<p class="service-price">From <strong>' + esc(s.price) + "</strong></p>" +
          "</article>";
      }).join("");
    }

    function renderStats(list) {
      var items = (cfg.about && cfg.about.stats) || [];
      list.innerHTML = items.map(function (s) {
        return "<li><span class=\"stat-num\">" + esc(s.num) + "</span><span class=\"stat-label\">" + esc(s.label) + "</span></li>";
      }).join("");
    }

    renderSteps(document.getElementById("process-list"));
    renderProjects(document.getElementById("projects-list"));
    renderTestimonials(document.getElementById("testimonials-list"));
    renderServices(document.getElementById("services-list"));
    renderStats(document.getElementById("stats-list"));

    /* meta */
    if (cfg.meta && cfg.meta.title) document.title = cfg.meta.title;
    if (cfg.meta && cfg.meta.description) {
      var md = document.querySelector('meta[name="description"]');
      if (md) md.setAttribute("content", cfg.meta.description);
    }

    /* theme: colors */
    var theme = (cfg.theme || {}).colors || {};
    var root = document.documentElement;
    function setVar(name, val) { if (val) root.style.setProperty(name, val); }
    setVar("--green", theme.green);
    setVar("--green-deep", theme.greenDeep);
    setVar("--gold", theme.gold);
    setVar("--paper", theme.paper);
    setVar("--white", theme.white);
    setVar("--ink-light", theme.green); /* body text on light sections = the green */

    /* theme: fonts */
    var preset = window.FONT_PRESETS && window.FONT_PRESETS[(cfg.theme || {}).fontPreset];
    if (preset) {
      root.style.setProperty("--font-display", '"' + preset.display + '", sans-serif');
      root.style.setProperty("--font-body", '"' + preset.body + '", sans-serif');
      var link = document.getElementById("cfg-fonts");
      if (link && link.getAttribute("href") !== preset.href) {
        var n = link.cloneNode();
        n.id = "cfg-fonts";
        n.setAttribute("href", preset.href);
        link.parentNode.insertBefore(n, link);
        link.parentNode.removeChild(link);
      }
    }

    /* theme: sizes */
    var scale = (cfg.theme || {}).displayScale || "m";
    var scaleVal = scale === "s" ? 0.88 : scale === "l" ? 1.12 : 1;
    root.style.setProperty("--display-scale", scaleVal);
    var bodySize = (cfg.theme || {}).bodySize || 1;
    root.style.setProperty("--fs-body", bodySize + "rem");
  }

  applyConfig(getCfg());

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
     Sends the brief to Formspree when a form ID is configured in the
     admin dashboard (Contact tab). Without one, it just shows the
     confirmation message, as before. */
  var form = document.getElementById("contact-form");
  var note = document.getElementById("form-note");
  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      var cfg = getCfg();
      var endpoint = (cfg.contact && cfg.contact.formspreeEndpoint)
        ? String(cfg.contact.formspreeEndpoint).trim().replace(/[\/?#].*$/, "") : "";
      var done = (cfg.contact && cfg.contact.formNote) || "Thanks — your brief is on its way.";

      if (!endpoint) {
        note.textContent = done;
        note.classList.remove("form-note-error");
        note.hidden = false;
        form.reset();
        return;
      }

      var btn = form.querySelector("button[type=submit]");
      var btnText = btn ? btn.textContent : "";
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Sending…";
      }

      fetch("https://formspree.io/f/" + endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      })
        .then(function (r) {
          if (!r.ok) throw new Error("Formspree responded " + r.status);
          note.textContent = done;
          note.classList.remove("form-note-error");
          note.hidden = false;
          form.reset();
        })
        .catch(function () {
          note.textContent = "Something went wrong — please email me directly instead.";
          note.classList.add("form-note-error");
          note.hidden = false;
        })
        .then(function () {
          if (btn) {
            btn.disabled = false;
            btn.textContent = btnText;
          }
        });
    });
  }
})();