/* flavia-carnet.js — bouton « Carnet » + feuilletage des indices trouvés pendant une aventure
 * Principe (demande Firmin, 11/11, façon carnet de Nathan Drake dans Uncharted) :
 * certaines étapes précises d'un scénario (marquées add_to_notebook dans l'admin,
 * ex. "Flavia trouve une note mystérieuse") deviennent, une fois complétées, une
 * page de ce carnet. Le joueur peut l'ouvrir à tout moment pendant l'aventure,
 * feuilleter les pages débloquées jusque-là, puis refermer — il retombe alors
 * pile sur l'étape où il en était, car ce module ne touche jamais à l'écran
 * de jeu en dessous (overlay pur, aucune navigation).
 * Persistance : localStorage, une entrée par scénario (ff_notebook_<adventureId>)
 * — aucun appel réseau, donc ça fonctionne aussi hors ligne.
 * Usage :
 *   FlaviaCarnet.mount(document.getElementById('screen-adventure')); // une fois, au boot
 *   FlaviaCarnet.setAdventure(adv.id);     // à l'entrée dans un scénario (affiche ses pages)
 *   FlaviaCarnet.reset(adv.id);            // sur un "recommencer" (vide les pages de CE scénario)
 *   FlaviaCarnet.unlock(adv.id, step);     // dès qu'une étape add_to_notebook est complétée
 */
(function (global) {
  var STORAGE_PREFIX = 'ff_notebook_';
  var el = {};
  var state = { adventureId: null, pages: [], index: 0 };

  function storageKey(advId) { return STORAGE_PREFIX + advId; }

  function readEntries(advId) {
    try { return JSON.parse(localStorage.getItem(storageKey(advId)) || '[]'); }
    catch (e) { return []; }
  }

  function writeEntries(advId, list) {
    try { localStorage.setItem(storageKey(advId), JSON.stringify(list)); }
    catch (e) { console.error('Erreur écriture carnet:', e); }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function refreshButton() {
    if (!el.btn) return;
    var n = state.pages.length;
    el.btn.style.display = n > 0 ? 'flex' : 'none';
    if (el.badge) el.badge.textContent = n;
  }

  // À appeler à l'entrée dans un scénario (démarrage ou reprise) : recharge
  // les pages déjà débloquées pour CE scénario précis — chaque aventure a
  // son propre carnet, stocké séparément.
  function setAdventure(adventureId) {
    state.adventureId = adventureId || null;
    state.pages = adventureId ? readEntries(adventureId) : [];
    state.index = Math.max(0, state.pages.length - 1);
    refreshButton();
  }

  // À appeler quand le joueur choisit de recommencer un scénario depuis le
  // début : les indices déjà trouvés lors d'une tentative précédente ne
  // doivent pas réapparaître avant d'avoir été retrouvés à nouveau.
  function reset(adventureId) {
    if (!adventureId) return;
    writeEntries(adventureId, []);
    if (state.adventureId === adventureId) { state.pages = []; state.index = 0; refreshButton(); }
  }

  // Appelé dès qu'une étape marquée add_to_notebook vient d'être complétée.
  // Sans effet si l'étape n'est pas marquée, ou si elle est déjà dans le
  // carnet (replay d'une même étape, anti-doublon).
  function unlock(adventureId, step) {
    if (!adventureId || !step || !step.add_to_notebook) return;
    var list = readEntries(adventureId);
    if (list.some(function (p) { return p.step_id === step.id; })) return;
    list.push({
      step_id: step.id,
      title:   step.notebook_label || step.title || '',
      text:    step.story_text || step.enigme || '',
      image:   step.image_url || ''
    });
    writeEntries(adventureId, list);
    if (state.adventureId === adventureId) {
      state.pages = list;
      refreshButton();
    }
  }

  function pageHTML(p) {
    return '<div class="fc-page">' +
      (p.image ? '<img class="fc-img" src="' + esc(p.image) + '" alt=""/>' : '') +
      '<div class="fc-pagetitle">' + esc(p.title) + '</div>' +
      (p.text ? '<div class="fc-pagetext">' + esc(p.text) + '</div>' : '') +
      '</div>';
  }

  function render() {
    var total = state.pages.length;
    if (!total) {
      el.sheet.innerHTML = '<div class="fc-hd"><button class="fc-x" data-fc="close" aria-label="Fermer">×</button><h2 class="fc-t">Carnet de notes</h2></div><div class="fc-empty">Aucune page pour l’instant.</div>';
      return;
    }
    var i = Math.min(Math.max(state.index, 0), total - 1);
    state.index = i;
    el.sheet.innerHTML =
      '<div class="fc-hd"><button class="fc-x" data-fc="close" aria-label="Fermer">×</button><h2 class="fc-t">Carnet de notes</h2><div class="fc-count">Page ' + (i + 1) + ' / ' + total + '</div></div>' +
      '<div class="fc-bd">' + pageHTML(state.pages[i]) + '</div>' +
      '<div class="fc-ft">' +
        '<button class="fc-nav" data-fc="prev"' + (i === 0 ? ' disabled' : '') + '>‹ Précédent</button>' +
        '<button class="fc-nav" data-fc="next"' + (i === total - 1 ? ' disabled' : '') + '>Suivant ›</button>' +
      '</div>';
  }

  function open() {
    if (!state.pages.length) return;
    state.index = state.pages.length - 1; // ouvre toujours sur la dernière page débloquée
    render();
    el.ov.classList.add('fc-open');
  }

  function close() { el.ov.classList.remove('fc-open'); }

  var CSS = '.fc-btn{position:absolute;right:12px;bottom:16px;z-index:50;display:none;align-items:center;gap:8px;height:48px;padding:0 14px;border:0;border-radius:24px;background:rgba(255,252,244,.96);box-shadow:0 3px 10px rgba(60,45,20,.28);font:700 14px/1 \'Nunito Sans\',system-ui,sans-serif;color:#3B3322;cursor:pointer}\n\
.fc-btn em{font-style:normal;min-width:20px;height:20px;border-radius:10px;background:#14301F;color:#F3E9CF;font:800 11px/20px \'Nunito Sans\',sans-serif;text-align:center;padding:0 5px}\n\
.fc-btn:active{transform:scale(.97)}\n\
.fc-ov{position:fixed;inset:0;z-index:5000;background:rgba(15,36,23,.5);display:none;align-items:center;justify-content:center;padding:12px;box-sizing:border-box}\n\
.fc-ov.fc-open{display:flex}\n\
.fc-sheet{position:relative;width:100%;max-width:420px;max-height:92vh;background:#E9D4A3 url(\'card-parchment.webp\') repeat;background-size:200px 200px;border-radius:20px;box-shadow:0 12px 34px rgba(10,20,10,.5);display:flex;flex-direction:column;overflow:hidden;font-family:\'Nunito Sans\',system-ui,sans-serif}\n\
.fc-hd{padding:18px 18px 10px;position:relative;border-bottom:1px solid rgba(120,74,28,0.18)}\n\
.fc-t{font:600 20px/1.1 Fraunces,Georgia,serif;color:#2B2616;margin:0}\n\
.fc-count{font-size:12.5px;color:#4A4332;margin-top:4px;font-weight:600}\n\
.fc-x{position:absolute;right:10px;top:12px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(0,0,0,.08);color:#3B3322;font:600 18px/1 sans-serif;cursor:pointer}\n\
.fc-bd{padding:16px 18px;overflow-y:auto;flex:1}\n\
.fc-page{display:flex;flex-direction:column;gap:12px}\n\
.fc-img{width:100%;border-radius:14px;border:1px solid rgba(120,74,28,0.18);box-shadow:0 5px 16px rgba(58,32,10,0.20);object-fit:cover;max-height:260px}\n\
.fc-pagetitle{font:600 18px/1.2 Fraunces,Georgia,serif;color:#2B2616}\n\
.fc-pagetext{font-size:14px;line-height:1.55;color:#4A4332;white-space:pre-wrap}\n\
.fc-empty{padding:30px 20px;text-align:center;color:#6B5F46;font-size:14px}\n\
.fc-ft{display:flex;gap:10px;padding:10px 18px 16px;border-top:1px solid rgba(120,74,28,0.18)}\n\
.fc-nav{flex:1;height:44px;border:0;border-radius:22px;background:rgba(0,0,0,.07);color:#3B3322;font:700 14px/1 \'Nunito Sans\',sans-serif;cursor:pointer}\n\
.fc-nav:disabled{opacity:.35;cursor:default}';

  function mount(container) {
    if (el.ov) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

    el.btn = document.createElement('button');
    el.btn.type = 'button';
    el.btn.className = 'fc-btn';
    el.btn.innerHTML = '📖 <span>Carnet</span><em>0</em>';
    (container || document.body).appendChild(el.btn);
    el.badge = el.btn.querySelector('em');

    el.ov = document.createElement('div');
    el.ov.className = 'fc-ov';
    el.ov.setAttribute('role', 'dialog');
    el.ov.setAttribute('aria-modal', 'true');
    el.sheet = document.createElement('div');
    el.sheet.className = 'fc-sheet';
    el.ov.appendChild(el.sheet);
    document.body.appendChild(el.ov);

    el.btn.addEventListener('click', open);
    el.ov.addEventListener('click', function (e) {
      if (e.target === el.ov) return close();
      var a = e.target.closest('[data-fc]'); if (!a) return;
      var v = a.getAttribute('data-fc');
      if (v === 'close') close();
      else if (v === 'prev' && state.index > 0) { state.index--; render(); }
      else if (v === 'next' && state.index < state.pages.length - 1) { state.index++; render(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && el.ov.classList.contains('fc-open')) close();
    });
  }

  global.FlaviaCarnet = { mount: mount, setAdventure: setAdventure, reset: reset, unlock: unlock, open: open, close: close };
})(window);
