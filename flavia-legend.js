/* flavia-legend.js — bouton « Légende » + fenêtre de synthèse + fenêtre « En savoir plus »
 * Contenu reconstruit (29/10) à partir des 4 vraies catégories de contenu de
 * l'app (mêmes clés que data-cat sur .map-filter-pill / content_type en base),
 * et des icônes/couleurs déjà définies dans flavia-markers.js (même sprite
 * SVG #ff-ic-*, réutilisé ici plutôt que redéfini, pour que la légende montre
 * exactement les pictogrammes déjà visibles sur la carte et les chips de filtre).
 * Usage :  FlaviaLegend.mount(document.getElementById('screen-map'));   // conteneur position:relative
 */
(function (global) {
  var CATEGORIES = [
    {
      key: 'caches_virtuelles',
      icon: 'loupe',
      color: '#6F6B14',
      name: 'Échos du Patrimoine',
      short: "Des lieux du patrimoine à découvrir en te baladant : une photo, un nom, une ligne d'histoire — pas d'énigme, pas de récit.",
      steps: [
        "Approche-toi du lieu : un halo pulsé s'allume dès que tu es à proximité.",
        "Entre dans le rayon de validation pour débloquer le lieu et gagner ses boussoles.",
        "Chaque découverte s'ajoute à sa collection — il y en a 10 à travers la Dracénie."
      ],
      note: "Idéal pour une balade improvisée, sans itinéraire imposé."
    },
    {
      key: 'tresors_oublies',
      icon: 'coffre',
      color: '#8B2332',
      name: 'Coffres cachés',
      short: "Le petit jeu de Flavia : elle adore cacher des souvenirs de son passage un peu partout, à toi de les retrouver.",
      steps: [
        "Suis les indices jusqu'à la zone où Flavia a caché son souvenir.",
        "Trouve la boîte sur place et ouvre-la.",
        "Scanne le QR code ou entre le code trouvé pour valider ta découverte."
      ],
      note: "De vrais coffres à dénicher sur le terrain, pas seulement virtuels."
    },
    {
      key: 'balade_decouverte',
      icon: 'plante',
      color: '#3F7D3A',
      // Variantes réelles (29/10) : chaque enquête affiche sur la carte
      // l'icône de son sub_theme, pas un symbole unique — cf.
      // advMarkerCategory() dans index.html (bySubTheme).
      variants: [
        { icon: 'chateau', color: '#3B4A9C' },
        { icon: 'plante',  color: '#3F7D3A' },
        { icon: 'outil',   color: '#4B5563' },
        { icon: 'fantome', color: '#6B4FA0' }
      ],
      name: 'Les Enquêtes de Flavia',
      short: "De petites études commandées par les villages — une source d'eau, un savoir-faire artisanal... Flavia s'entraîne avant les grandes chasses.",
      steps: [
        "Choisis une enquête près de chez toi sur la carte.",
        "Suis le fil de l'étude : observation, petites questions, indices sur place.",
        "Termine l'enquête pour gagner boussoles et XP."
      ],
      note: "Le symbole change selon le thème : patrimoine, nature, savoir-faire, légendes..."
    },
    {
      key: 'chasse_tresor_flavia',
      icon: 'boussole',
      color: '#C2700A',
      name: 'Les Chasses de Flavia',
      short: "Des aventures guidées en plusieurs étapes, avec énigmes et récit — Flavia avance grâce aux carnets de son grand-père.",
      steps: [
        "Lance l'aventure depuis le point de départ sur la carte.",
        "Résous les énigmes étape après étape, indices à l'appui.",
        "Termine le parcours pour gagner boussoles, XP et badge."
      ],
      note: "Durée : de 20 minutes à 2 h selon le scénario."
    }
  ];
  var STATES = 'ÉTATS : halo pulsé = tu es à proximité · pastille dorée = découvert · gris + cadenas = verrouillé · chiffre doré = plusieurs lieux groupés';
  // Seul picto propre à ce module : l'icône "i" du bouton Légende, absente du
  // sprite flavia-markers.js. Tous les pictos de catégorie référencent
  // directement #ff-ic-* (injecté par FlaviaMarkers.ensure()).
  var SYMBOLS = '<symbol id="fl-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".6" fill="currentColor"/></symbol>';
  var CSS = '.fl-btn{position:absolute;left:12px;bottom:12px;z-index:1000;height:44px;padding:0 16px 0 12px;border:0;border-radius:22px;background:rgba(255,252,244,.96);box-shadow:0 2px 8px rgba(60,45,20,.25);display:flex;align-items:center;gap:8px;font:700 14px/1 \'Nunito Sans\',system-ui,sans-serif;color:#3B3322;cursor:pointer}\n\
.fl-ic{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\n\
.fl-ov{position:fixed;inset:0;z-index:5000;background:rgba(15,36,23,.5);display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}\n\
.fl-ov.fl-open{display:flex}\n\
.fl-sheet{position:relative;width:100%;max-width:420px;max-height:100%;background:#E9D4A3 url(\'card-parchment.webp\') repeat;background-size:200px 200px;border-radius:20px;box-shadow:0 12px 34px rgba(10,20,10,.5);display:flex;flex-direction:column;overflow:hidden;font-family:\'Nunito Sans\',system-ui,sans-serif}\n\
.fl-hd{padding:20px 18px 12px;position:relative}\n\
.fl-hd.fl-line{border-bottom:1px solid #E2D7B8}\n\
.fl-t{font:600 22px/1.1 Fraunces,Georgia,serif;color:#2B2616;margin:0}\n\
.fl-sub{font-size:13.5px;color:#4A4332;margin-top:4px}\n\
.fl-back{border:0;background:none;padding:0 0 8px;font:700 13px/1 \'Nunito Sans\',sans-serif;color:#8A5A12;cursor:pointer}\n\
.fl-x{position:absolute;right:10px;top:10px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.08);color:#3B3322;font:600 18px/1 sans-serif;cursor:pointer}\n\
.fl-bd{padding:6px 18px 14px;overflow:auto;display:flex;flex-direction:column;gap:14px}\n\
.fl-row{display:flex;gap:12px;align-items:flex-start}\n\
.fl-sym{flex:none;width:46px;height:46px;border-radius:50%;background:var(--c);border:3px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 2px 6px rgba(60,45,20,.35)}\n\
.fl-sym svg{width:27px;height:27px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\n\
.fl-symgrp{flex:none;width:46px;display:flex;flex-wrap:wrap;gap:4px}\n\
.fl-symgrp .fl-sym-sm{width:21px;height:21px;border-width:2px;box-shadow:none}\n\
.fl-symgrp .fl-sym-sm svg{width:12px;height:12px;stroke-width:2}\n\
.fl-h{font:700 17px/1.15 Fraunces,Georgia,serif;color:var(--c)}\n\
.fl-p{font-size:13.5px;line-height:1.4;color:#4A4332;margin-top:2px}\n\
.fl-ul{margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.4;color:#4A4332}\n\
.fl-note{margin-top:6px;font:700 12px/1.3 \'Nunito Sans\',sans-serif;color:var(--c)}\n\
.fl-states{padding-top:10px;border-top:1px solid #E2D7B8;font:700 12px/1.4 \'Nunito Sans\',sans-serif;color:#4A4332}\n\
.fl-ft{display:flex;gap:10px;padding:8px 18px 16px}\n\
.fl-b{flex:1;height:46px;border:0;border-radius:23px;font:700 15px/1 \'Nunito Sans\',sans-serif;cursor:pointer}\n\
.fl-b.fl-s{background:rgba(0,0,0,.07);color:#3B3322}.fl-b.fl-p1{flex:1.3;background:#14301F;color:#F3E9CF}';
  var el = {};
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sym(c) {
    if (c.variants) {
      return '<div class="fl-symgrp">' + c.variants.map(function (v) {
        return '<div class="fl-sym fl-sym-sm" style="--c:' + v.color + '"><svg aria-hidden="true"><use href="#ff-ic-' + v.icon + '"/></svg></div>';
      }).join('') + '</div>';
    }
    return '<div class="fl-sym" style="--c:' + c.color + '"><svg aria-hidden="true"><use href="#ff-ic-' + c.icon + '"/></svg></div>';
  }

  function summaryHTML() {
    var h = '<div class="fl-hd"><button class="fl-x" data-fl="close" aria-label="Fermer">×</button><h2 class="fl-t">Légende de la carte</h2><div class="fl-sub">Chaque symbole est un type de contenu.</div></div><div class="fl-bd">';
    CATEGORIES.forEach(function (c) {
      h += '<div class="fl-row" style="--c:' + c.color + '">' + sym(c) + '<div><div class="fl-h">' + esc(c.name) + '</div><div class="fl-p">' + esc(c.short) + '</div></div></div>';
    });
    return h + '</div><div class="fl-ft"><button class="fl-b fl-s" data-fl="close">Fermer</button><button class="fl-b fl-p1" data-fl="more">En savoir plus</button></div>';
  }
  function detailHTML() {
    var h = '<div class="fl-hd fl-line"><button class="fl-x" data-fl="close" aria-label="Fermer">×</button><button class="fl-back" data-fl="back">‹ Retour</button><h2 class="fl-t">Comment ça marche ?</h2></div><div class="fl-bd">';
    CATEGORIES.forEach(function (c) {
      h += '<div style="--c:' + c.color + '"><div class="fl-row" style="align-items:center">' + sym(c) + '<div class="fl-h" style="font-size:19px">' + esc(c.name) + '</div></div><ul class="fl-ul">' +
        c.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul><div class="fl-note">' + esc(c.note) + '</div></div>';
    });
    return h + '<div class="fl-states">' + esc(STATES) + '</div></div>';
  }
  function show(which) {
    el.sheet.innerHTML = which === 'detail' ? detailHTML() : summaryHTML();
    el.ov.classList.add('fl-open');
  }
  function hide() { el.ov.classList.remove('fl-open'); }

  function mount(container) {
    if (el.ov) return;
    // Dépend du sprite SVG #ff-ic-* injecté par flavia-markers.js — appel
    // défensif (idempotent) au cas où ce module serait monté avant lui.
    if (global.FlaviaMarkers && typeof global.FlaviaMarkers.ensure === 'function') {
      global.FlaviaMarkers.ensure();
    }
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var sp = document.createElement('div'); sp.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    sp.innerHTML = '<svg width="0" height="0" aria-hidden="true"><defs>' + SYMBOLS + '</defs></svg>'; document.body.appendChild(sp);

    var btn = document.createElement('button'); btn.className = 'fl-btn'; btn.type = 'button';
    btn.innerHTML = '<svg class="fl-ic" aria-hidden="true"><use href="#fl-info"/></svg>Légende';
    (container || document.body).appendChild(btn);

    el.ov = document.createElement('div'); el.ov.className = 'fl-ov'; el.ov.setAttribute('role', 'dialog'); el.ov.setAttribute('aria-modal', 'true');
    el.sheet = document.createElement('div'); el.sheet.className = 'fl-sheet'; el.ov.appendChild(el.sheet); document.body.appendChild(el.ov);

    btn.addEventListener('click', function () { show('summary'); });
    el.ov.addEventListener('click', function (e) {
      if (e.target === el.ov) return hide();
      var a = e.target.closest('[data-fl]'); if (!a) return;
      var v = a.getAttribute('data-fl');
      if (v === 'close') hide(); else if (v === 'more') show('detail'); else if (v === 'back') show('summary');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  }
  global.FlaviaLegend = { CATEGORIES: CATEGORIES, mount: mount, open: function () { show('summary'); }, close: hide };
})(window);
