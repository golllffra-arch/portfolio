/* ============================================================
   ADMIN DASHBOARD — schema-driven editor for everything on the
   site: texts, images, fonts, theme colors, prices, links.
   - Password lock: the whole dashboard is gated; the password is
     stored only as a salted hash in this browser.
   - Save draft: keeps changes in this browser (localStorage)
   - Export / Import: backup or move config as JSON
   - Publish: pushes js/site-config.js to GitHub, Vercel redeploys
     automatically so EVERY visitor sees the new content.
     The GitHub token is saved in this browser too, but the token
     field is only filled in after the password unlocks the panel.
   ============================================================ */

(function () {
  "use strict";

  var STORE_KEY = "ms_portfolio_cfg_v1";
  var GH_STORE_KEY = "ms_portfolio_github_v1";
  var GH_TOKEN_KEY = "ms_portfolio_gh_token_v1";
  var PWD_STORE_KEY = "ms_portfolio_pwd_v1";
  var unlocked = false;

  function getPath(obj, path) {
    return path.split(".").reduce(function (o, k) {
      if (o == null) return undefined;
      return o[Number.isNaN(+k) ? k : +k];
    }, obj);
  }
  function setPath(obj, path, val) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      if (cur[k] == null) cur[k] = Number.isNaN(+parts[i + 1]) ? {} : [];
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = val;
  }
  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadCfg() {
    try {
      var s = localStorage.getItem(STORE_KEY);
      if (s) return JSON.parse(s);
    } catch (e) { /* ignore */ }
    return deepClone(window.SITE_CONFIG);
  }
  var cfg = loadCfg();
  var gh = {};
  try { gh = JSON.parse(localStorage.getItem(GH_STORE_KEY) || "{}"); } catch (e) { gh = {}; }

  var statusEl = document.getElementById("status");
  var statusTimer = null;
  function flash(msg) {
    statusEl.textContent = msg;
    statusEl.classList.add("show");
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { statusEl.classList.remove("show"); }, 3000);
  }

  /* ================= PASSWORD LOCK ================= */
  function toHex(buf) {
    var bytes = new Uint8Array(buf);
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += (bytes[i] + 0x100).toString(16).slice(1);
    return s;
  }
  function fallbackHash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return "fb" + h.toString(16);
  }
  function hashPass(str) {
    if (window.crypto && crypto.subtle) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(toHex);
    }
    return Promise.resolve(fallbackHash(str));
  }
  function makeCredential(pass) {
    var salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
    return hashPass(salt + "::" + pass).then(function (h) { return { salt: salt, hash: h }; });
  }
  function verifyCredential(pass) {
    var rec = null;
    try { rec = JSON.parse(localStorage.getItem(PWD_STORE_KEY) || "null"); } catch (e) { rec = null; }
    if (!rec || !rec.salt) return Promise.resolve(false);
    return hashPass(rec.salt + "::" + pass).then(function (h) { return h === rec.hash; });
  }
  function getSavedToken() {
    try { return localStorage.getItem(GH_TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function saveToken() {
    var t = document.getElementById("gh-token");
    if (!t) return;
    try { localStorage.setItem(GH_TOKEN_KEY, t.value.trim()); } catch (e) { /* ignore */ }
  }

  var lockEl = document.getElementById("lock");
  var lockPass = document.getElementById("lock-pass");
  var lockPass2 = document.getElementById("lock-pass2");
  var lockBtn = document.getElementById("lock-btn");
  var lockHint = document.getElementById("lock-hint");
  var lockReset = document.getElementById("lock-reset");
  var setupMode = false;
  try { setupMode = !localStorage.getItem(PWD_STORE_KEY); } catch (e) { setupMode = true; }

  if (setupMode) {
    lockPass2.style.display = "block";
    lockHint.textContent = "First time here — create the admin password. You'll need it to open the dashboard from now on.";
    lockBtn.textContent = "Create password & unlock";
  } else {
    lockReset.style.display = "block";
  }

  function unlockUI() {
    unlocked = true;
    lockEl.setAttribute("hidden", "");
    var t = document.getElementById("gh-token");
    if (t) t.value = getSavedToken();
    lockPass.value = "";
    lockPass2.value = "";
    if (setupMode) flash("Password set — dashboard unlocked.");
    else flash("Unlocked.");
  }

  lockBtn.addEventListener("click", function () {
    var p1 = lockPass.value;
    if (!p1 || p1.length < 4) { flash("Password must be at least 4 characters."); return; }
    if (setupMode) {
      if (p1 !== lockPass2.value) { flash("Passwords don't match."); return; }
      makeCredential(p1).then(function (rec) {
        try { localStorage.setItem(PWD_STORE_KEY, JSON.stringify(rec)); } catch (e) { /* ignore */ }
        setupMode = false;
        unlockUI();
      });
      return;
    }
    verifyCredential(p1).then(function (ok) {
      if (ok) { unlockUI(); }
      else { flash("Wrong password."); lockPass.value = ""; }
    });
  });

  lockPass.addEventListener("keydown", function (e) { if (e.key === "Enter") lockBtn.click(); });
  lockPass2.addEventListener("keydown", function (e) { if (e.key === "Enter") lockBtn.click(); });

  lockReset.addEventListener("click", function () {
    if (!confirm("Reset the admin password? Anyone using this browser can then open the dashboard. You'll create a new password right after.")) return;
    try { localStorage.removeItem(PWD_STORE_KEY); } catch (e) { /* ignore */ }
    location.reload();
  });

  /* ================= SCHEMA ================= */
  var PRESET_OPTIONS = Object.keys(window.FONT_PRESETS).map(function (id) {
    var p = window.FONT_PRESETS[id];
    return { value: id, label: p.display + " + " + p.body };
  });
  var ICON_OPTIONS = Object.keys(window.SITE_ICONS).map(function (k) {
    return { value: k, label: k };
  });

  var SCHEMA = [
    { id: "general", label: "General", hint: "Name, logo initials, email, SEO title & description.",
      groups: [
        { title: "Brand & identity", fields: [
          { key: "meta.title", label: "Page title (browser tab)", type: "text" },
          { key: "meta.description", label: "SEO description", type: "textarea" },
          { key: "meta.initials", label: "Logo initials (brand mark)", type: "text" },
          { key: "general.name", label: "Your name", type: "text" },
          { key: "general.role", label: "Role / tagline (hero eyebrow)", type: "text" },
          { key: "general.email", label: "Email (footer + contact)", type: "text" }
        ] }
      ] },

    { id: "hero", label: "Hero", hint: "The big opening screen.",
      groups: [
        { title: "Headline & copy", fields: [
          { key: "hero.eyebrow", label: "Eyebrow line", type: "text" },
          { key: "hero.title1", label: "Headline line 1 (solid)", type: "text" },
          { key: "hero.title2", label: "Headline line 2 (outlined)", type: "text" },
          { key: "hero.sub", label: "Subtitle", type: "textarea" },
          { key: "hero.cta1", label: "Button 1 text", type: "text" },
          { key: "hero.cta2", label: "Button 2 text", type: "text" },
          { key: "hero.meta", label: "Small status line under buttons", type: "text" },
          { key: "hero.badgeNum", label: "Badge number (e.g. 8+)", type: "text" },
          { key: "hero.badgeLabel", label: "Badge label (use \\n for line break)", type: "text" },
          { key: "hero.caption", label: "Caption beside photo", type: "text" },
          { key: "hero.image", label: "Hero photo", type: "image" }
        ] }
      ] },

    { id: "process", label: "Process", hint: "The 'How I work' steps.",
      groups: [
        { title: "Section text", fields: [
          { key: "process.eyebrow", label: "Eyebrow", type: "text" },
          { key: "process.title", label: "Title (before gold accent)", type: "text" },
          { key: "process.titleAccent", label: "Title gold accent", type: "text" },
          { key: "process.intro", label: "Intro paragraph", type: "textarea" }
        ] },
        { title: "Steps", list: "process.steps", itemFields: [
          { key: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { key: "title", label: "Step title", type: "text" },
          { key: "duration", label: "Duration label", type: "text" },
          { key: "desc", label: "Description", type: "textarea" }
        ] }
      ] },

    { id: "work", label: "Projects", hint: "Case studies with problem / decisions / result.",
      groups: [
        { title: "Section text", fields: [
          { key: "work.eyebrow", label: "Eyebrow", type: "text" },
          { key: "work.title", label: "Title (before gold accent)", type: "text" },
          { key: "work.titleAccent", label: "Title gold accent", type: "text" },
          { key: "work.labels.problem", label: "Label: problem", type: "text" },
          { key: "work.labels.decisions", label: "Label: key decisions", type: "text" },
          { key: "work.labels.result", label: "Label: result", type: "text" }
        ] },
        { title: "Projects (add / remove / edit)", list: "work.projects", itemFields: [
          { key: "kicker", label: "Category tag", type: "text" },
          { key: "title", label: "Project name", type: "text" },
          { key: "problem", label: "The problem", type: "textarea" },
          { key: "decisions", label: "Key decisions (one per line)", type: "textarea", array: true },
          { key: "result", label: "The result", type: "textarea" },
          { key: "link", label: "Live link URL", type: "text" },
          { key: "linkLabel", label: "Link button text", type: "text" },
          { key: "image", label: "Screenshot", type: "image" },
          { key: "imageAlt", label: "Screenshot alt text", type: "text" }
        ] }
      ] },

    { id: "testimonials", label: "Testimonials", hint: "What clients say about you.",
      groups: [
        { title: "Section text", fields: [
          { key: "testimonials.eyebrow", label: "Eyebrow", type: "text" },
          { key: "testimonials.title", label: "Title (before gold accent)", type: "text" },
          { key: "testimonials.titleAccent", label: "Title gold accent", type: "text" },
          { key: "testimonials.intro", label: "Intro paragraph", type: "textarea" }
        ] },
        { title: "Quotes", list: "testimonials.items", itemFields: [
          { key: "quote", label: "Quote", type: "textarea" },
          { key: "name", label: "Name", type: "text" },
          { key: "role", label: "Role, company", type: "text" }
        ] }
      ] },

    { id: "services", label: "Services", hint: "Offer cards with starting prices.",
      groups: [
        { title: "Section text", fields: [
          { key: "services.eyebrow", label: "Eyebrow", type: "text" },
          { key: "services.title", label: "Title (before gold accent)", type: "text" },
          { key: "services.titleAccent", label: "Title gold accent", type: "text" }
        ] },
        { title: "Service cards", list: "services.items", itemFields: [
          { key: "icon", label: "Icon", type: "select", options: ICON_OPTIONS },
          { key: "title", label: "Service name", type: "text" },
          { key: "desc", label: "Description", type: "textarea" },
          { key: "price", label: "Starting price (e.g. $1,500)", type: "text" }
        ] }
      ] },

    { id: "about", label: "About", hint: "Bio, quote and stats.",
      groups: [
        { title: "Section text", fields: [
          { key: "about.eyebrow", label: "Eyebrow", type: "text" },
          { key: "about.title", label: "Title (before gold accent)", type: "text" },
          { key: "about.titleAccent", label: "Title gold accent", type: "text" },
          { key: "about.bio1", label: "Bio paragraph 1", type: "textarea" },
          { key: "about.bio2", label: "Bio paragraph 2", type: "textarea" },
          { key: "about.why", label: "Quote (the 'why I do this')", type: "textarea" },
          { key: "about.image", label: "Portrait photo", type: "image" },
          { key: "about.imageAlt", label: "Portrait alt text", type: "text" }
        ] },
        { title: "Stats", list: "about.stats", itemFields: [
          { key: "num", label: "Number (e.g. 8+)", type: "text" },
          { key: "label", label: "Label", type: "text" }
        ] }
      ] },

    { id: "contact", label: "Contact", hint: "Contact section text and details.",
      groups: [
        { title: "Section text", fields: [
          { key: "contact.eyebrow", label: "Eyebrow", type: "text" },
          { key: "contact.title", label: "Title (before gold accent)", type: "text" },
          { key: "contact.titleAccent", label: "Title gold accent", type: "text" },
          { key: "contact.intro", label: "Intro paragraph", type: "textarea" },
          { key: "contact.email", label: "Email shown in contact list", type: "text" },
          { key: "contact.responseTime", label: "Response time text", type: "text" },
          { key: "contact.timezone", label: "Timezone / availability", type: "text" },
          { key: "contact.formNote", label: "Message shown after submitting the form", type: "text" },
          { key: "contact.formspreeEndpoint", label: "Formspree form ID (optional)", type: "text", placeholder: "e.g. xyzabcde — from your formspree.io form URL; leave empty to only show the confirmation message" },
          { key: "footer.tag", label: "Footer tagline", type: "text" }
        ] }
      ] },

    { id: "theme", label: "Theme", hint: "Colors, fonts and sizes — changes apply instantly on the site.",
      groups: [
        { title: "Colors", fields: [
          { key: "theme.colors.green", label: "Dark green (main background)", type: "color" },
          { key: "theme.colors.greenDeep", label: "Darker green (footer, admin)", type: "color" },
          { key: "theme.colors.gold", label: "Gold (headings, accents)", type: "color" },
          { key: "theme.colors.paper", label: "Off-white (light sections)", type: "color" },
          { key: "theme.colors.white", label: "White (text on dark)", type: "color" }
        ] },
        { title: "Fonts", fields: [
          { key: "theme.fontPreset", label: "Font pairing", type: "select", options: PRESET_OPTIONS },
          { key: "theme.displayScale", label: "Heading size", type: "select", options: [
            { value: "s", label: "Small" }, { value: "m", label: "Medium (default)" }, { value: "l", label: "Large" }
          ] },
          { key: "theme.bodySize", label: "Body text size", type: "range", min: 0.875, max: 1.125, step: 0.025 }
        ] }
      ] },

    { id: "publish", label: "Publish", hint: "Push your saved changes to GitHub — Vercel redeploys and everyone sees them.",
      groups: [] }
  ];

  /* ================= RENDER ================= */
  var tabsEl = document.getElementById("tabs");
  var panelsEl = document.getElementById("panels");

  SCHEMA.forEach(function (g) {
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = g.label;
    b.dataset.tab = g.id;
    b.addEventListener("click", function () { activate(g.id); });
    tabsEl.appendChild(b);

    var panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "panel-" + g.id;
    panel.innerHTML = "<h2></h2><p class=\"hint\"></p>";
    panel.querySelector("h2").textContent = g.label;
    panel.querySelector(".hint").textContent = g.hint;
    panelsEl.appendChild(panel);
  });

  function activate(id) {
    tabsEl.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.tab === id);
    });
    panelsEl.querySelectorAll(".panel").forEach(function (p) {
      p.classList.toggle("active", p.id === "panel-" + id);
    });
    if (id === "publish") renderPublishPanel();
  }
  activate("general");

  /* ---------- field builders ---------- */
  function makeInput(f, value) {
    var w = document.createElement("div");
    w.className = "field";
    w.setAttribute("data-key", f.key);
    if (f.array) w.setAttribute("data-array", "1");

    if (f.type === "color") {
      w.innerHTML = "<label>" + f.label + "</label><input type=\"color\" />";
      w.querySelector("input").value = value || "#1D3331";
    } else if (f.type === "select") {
      w.innerHTML = "<label>" + f.label + "</label><select></select>";
      var sel = w.querySelector("select");
      f.options.forEach(function (o) {
        var opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        if (o.value === value) opt.selected = true;
        sel.appendChild(opt);
      });
    } else if (f.type === "range") {
      w.innerHTML = "<label>" + f.label + ' <span class="range-val"></span></label>' +
        '<input type="range" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" />';
      var range = w.querySelector("input");
      range.value = value == null ? f.min : value;
      var valSpan = w.querySelector(".range-val");
      valSpan.textContent = range.value;
      range.addEventListener("input", function () { valSpan.textContent = range.value; });
    } else if (f.type === "image") {
      w.innerHTML = "<label>" + f.label + "</label><div class=\"imgrow\">" +
        "<img src=\"\" alt=\"\" /><div class=\"imgmeta\">" +
        '<input type="text" placeholder="assets/img/… or paste an image URL" />' +
        '<div style="margin-top:0.4rem"><button type="button" class="btn small">Upload image</button>' +
        '<input type="file" accept="image/*" hidden /></div>' +
        '<div class="hint">Uploads are resized to max 1600px and saved as a data URL.</div>' +
        "</div></div>";
      var img = w.querySelector("img");
      var txt = w.querySelector("input[type=text]");
      var file = w.querySelector("input[type=file]");
      var upBtn = w.querySelector("button");
      txt.value = value || "";
      if (value) img.src = value;
      txt.addEventListener("input", function () { img.src = txt.value; });
      upBtn.addEventListener("click", function () { file.click(); });
      file.addEventListener("change", function () {
        var fileObj = file.files && file.files[0];
        if (!fileObj) return;
        var reader = new FileReader();
        reader.onload = function (e) {
          var imgEl = new Image();
          imgEl.onload = function () {
            var maxW = 1600;
            var scale = Math.min(1, maxW / imgEl.width);
            var cv = document.createElement("canvas");
            cv.width = Math.round(imgEl.width * scale);
            cv.height = Math.round(imgEl.height * scale);
            cv.getContext("2d").drawImage(imgEl, 0, 0, cv.width, cv.height);
            var mime = fileObj.type === "image/png" ? "image/png" : "image/jpeg";
            var dataUrl = cv.toDataURL(mime, 0.85);
            txt.value = dataUrl;
            img.src = dataUrl;
            flash("Image ready — click Save draft");
          };
          imgEl.src = e.target.result;
        };
        reader.readAsDataURL(fileObj);
      });
    } else if (f.type === "textarea") {
      w.innerHTML = "<label>" + f.label + "</label><textarea rows=\"3\"></textarea>";
      var ta = w.querySelector("textarea");
      if (f.array) ta.value = (value || []).join("\n");
      else ta.value = value || "";
    } else {
      w.innerHTML = "<label>" + f.label + "</label><input type=\"text\" />";
      var inp = w.querySelector("input");
      if (f.placeholder) inp.setAttribute("placeholder", f.placeholder);
      inp.value = value || "";
    }
    return w;
  }

  /* ---------- groups & lists ---------- */
  function renderGroup(panel, g, cfgRoot) {
    var box = document.createElement("div");
    box.className = "group";
    box.innerHTML = "<h3>" + g.title + "</h3>";

    if (g.list) {
      box.setAttribute("data-list", g.list);
      var listWrap = document.createElement("div");
      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn small";
      addBtn.textContent = "+ Add item";
      addBtn.addEventListener("click", function () {
        var items = getPath(cfg, g.list) || [];
        items.push({});
        setPath(cfg, g.list, items);
        renderItemList(listWrap, g, g.list);
        flash("Item added — fill it in, then Save draft");
      });
      box.appendChild(listWrap);
      box.appendChild(addBtn);
      panel.appendChild(box);
      renderItemList(listWrap, g, g.list);
      return;
    }

    g.fields.forEach(function (f) {
      box.appendChild(makeInput(f, getPath(cfgRoot, f.key)));
    });
    panel.appendChild(box);
  }

  function renderItemList(listWrap, g, listPath) {
    listWrap.innerHTML = "";
    var items = getPath(cfg, listPath) || [];
    items.forEach(function (item, idx) {
      var card = document.createElement("div");
      card.className = "item";

      var head = document.createElement("div");
      head.className = "item-head";
      var title = document.createElement("strong");
      title.textContent = "#" + (idx + 1) + " " + (item.title || item.name || item.kicker || "");
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn small";
      del.textContent = "Remove";
      del.addEventListener("click", function () {
        var arr = getPath(cfg, listPath);
        arr.splice(idx, 1);
        setPath(cfg, listPath, arr);
        renderItemList(listWrap, g, listPath);
      });
      head.appendChild(title);
      head.appendChild(del);
      card.appendChild(head);

      var grid = document.createElement("div");
      grid.className = "grid2";
      g.itemFields.forEach(function (f) {
        var w = makeInput(f, getPath(item, f.key));
        w.setAttribute("data-key", listPath + "." + idx + "." + f.key);
        if (f.array) w.setAttribute("data-array", "1");
        if (f.type === "textarea" || f.type === "image") grid.className = "grid2"; /* keep grid */
        grid.appendChild(w);
      });
      card.appendChild(grid);
      listWrap.appendChild(card);
    });
  }

  SCHEMA.forEach(function (g) {
    var panel = document.getElementById("panel-" + g.id);
    g.groups.forEach(function (grp) { renderGroup(panel, grp, cfg); });
  });

  /* ---------- collect values back into cfg ---------- */
  function collectValues() {
    panelsEl.querySelectorAll(".field[data-key]").forEach(function (w) {
      var input = w.querySelector("input:not([type=file]), textarea, select");
      if (!input) return;
      var val;
      if (input.type === "range") val = parseFloat(input.value);
      else if (input.tagName === "TEXTAREA" && w.getAttribute("data-array") === "1") {
        val = input.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
      }
      else val = input.value;
      setPath(cfg, w.getAttribute("data-key"), val);
    });
    return cfg;
  }

  /* ================= SAVE / EXPORT / IMPORT ================= */
  document.getElementById("btn-save").addEventListener("click", function () {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(collectValues()));
      flash("Draft saved in this browser. Publish to make it live for everyone.");
    } catch (e) {
      flash("Save failed — storage full? Try smaller images.");
    }
  });

  document.getElementById("btn-export").addEventListener("click", function () {
    collectValues();
    var blob = new Blob([JSON.stringify(cfg, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "site-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
    flash("Config exported — keep it as a backup.");
  });

  document.getElementById("btn-import").addEventListener("click", function () {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file").addEventListener("change", function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        cfg = JSON.parse(e.target.result);
        localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
        location.reload();
      } catch (err) {
        flash("Import failed — not a valid config file.");
      }
    };
    reader.readAsText(f);
  });

  /* ================= PUBLISH TO GITHUB ================= */
  function renderPublishPanel() {
    var panel = document.getElementById("panel-publish");
    panel.innerHTML = "";
    var h2 = document.createElement("h2");
    h2.textContent = "Publish";
    var hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent = "Push your saved changes to GitHub — Vercel redeploys and everyone sees them.";
    panel.appendChild(h2);
    panel.appendChild(hint);

    var box = document.createElement("div");
    box.className = "group";
    box.innerHTML = "<h3>Push to GitHub</h3>" +
      '<div class="field"><label>Repository (owner/repo)</label><input type="text" id="gh-repo" /></div>' +
      '<div class="field"><label>Branch</label><input type="text" id="gh-branch" /></div>' +
      '<div class="field"><label>GitHub token</label><input type="password" id="gh-token" placeholder="Personal Access Token (repo scope)" /></div>' +
      '<div class="field"><label>Commit message</label><input type="text" id="gh-msg" /></div>' +
      '<button type="button" class="btn gold" id="gh-publish">Publish site changes</button>' +
      '<p class="hint" style="margin-top:0.8rem">Get a token: github.com → Settings → Developer settings → Personal access tokens → Generate new token → tick "repo". Your token is saved in this browser and refilled automatically — the panel shows it only after you unlock with the admin password.</p>' +
      '<p class="hint">After publishing, Vercel auto-redeploys (~1 min) and every visitor sees the new content.</p>';
    panel.appendChild(box);

    document.getElementById("gh-repo").value = gh.repo || "golllffra-arch/portfolio";
    document.getElementById("gh-branch").value = gh.branch || "master";
    document.getElementById("gh-msg").value = "Update site content from admin";
    var tok = document.getElementById("gh-token");
    if (unlocked) tok.value = getSavedToken();
    tok.addEventListener("input", saveToken);
    tok.addEventListener("blur", saveToken);
    document.getElementById("gh-publish").addEventListener("click", publish);
  }

  function publish() {
    collectValues();
    var repo = document.getElementById("gh-repo").value.trim();
    var branch = document.getElementById("gh-branch").value.trim();
    var token = document.getElementById("gh-token").value.trim();
    var msg = document.getElementById("gh-msg").value.trim() || "Update site content from admin";
    if (!repo || !token) { flash("Repository and token are required."); return; }

    gh = { repo: repo, branch: branch };
    try { localStorage.setItem(GH_STORE_KEY, JSON.stringify(gh)); } catch (e) { /* ignore */ }
    saveToken();

    var content = "window.SITE_CONFIG = " + JSON.stringify(cfg, null, 2) + ";\n" +
      "window.FONT_PRESETS = " + JSON.stringify(window.FONT_PRESETS, null, 2) + ";\n" +
      "window.SITE_ICONS = " + JSON.stringify(window.SITE_ICONS, null, 2) + ";\n";
    var b64 = btoa(unescape(encodeURIComponent(content)));
    var headers = { Authorization: "token " + token, Accept: "application/vnd.github.v3+json" };

    fetch("https://api.github.com/repos/" + repo + "/contents/js/site-config.js?ref=" + branch, { headers: headers })
      .then(function (r) { return r.json(); })
      .then(function (existing) {
        var body = { message: msg, content: b64, branch: branch };
        if (existing && existing.sha) body.sha = existing.sha;
        return fetch("https://api.github.com/repos/" + repo + "/contents/js/site-config.js", {
          method: "PUT",
          headers: headers,
          body: JSON.stringify(body)
        });
      })
      .then(function (r) {
        if (!r.ok) throw new Error("GitHub responded " + r.status);
        return r.json();
      })
      .then(function () {
        flash("Published! Vercel is redeploying (~1 min).");
      })
      .catch(function (err) {
        flash("Publish failed: " + err.message);
      });
  }
})();