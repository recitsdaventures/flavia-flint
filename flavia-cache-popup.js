/* flavia-cache-popup.js — fenêtre de validation d'une cache virtuelle (progression de collection, sans tampon)
 * Dépend de flavia-collections.js (chargé avant, et FlaviaCollections.mount() déjà appelé).
 * Icone loupe (29/10) : réutilise #ff-ic-loupe deja injecte par flavia-markers.js
 * plutot que d'en redefinir une copie locale (meme trace que flavia-legend.js).
 *
 * Usage, juste après avoir enregistré la découverte en base :
 *   FlaviaCachePopup.show({
 *     collection: 'savoir',   // clé de la collection (voir FlaviaCollections.COLLECTIONS)
 *     doneBefore: 0,          // nombre de caches déjà découvertes AVANT celle-ci
 *     total: 8,               // nombre de caches de la collection
 *     xp: 10,
 *     onContinue: function () { … }   // optionnel
 *   });
 */
(function (global) {
  var FC = global.FlaviaCollections;
  var CSS = '\
.fcp-ov{position:fixed;inset:0;z-index:6000;background:rgba(15,36,23,.55);display:flex;align-items:flex-start;justify-content:center;padding:96px 24px 24px;box-sizing:border-box;overflow:auto}\
.fcp{width:100%;max-width:380px;background:#E9D4A3 url(\'card-parchment.webp\') repeat;background-size:200px 200px;border-radius:24px;box-shadow:0 14px 40px rgba(10,20,10,.55);padding:26px 20px 20px;display:flex;flex-direction:column;align-items:center;gap:14px;font-family:"Nunito Sans",system-ui,sans-serif;color:#2B2616}\
.fcp-lo{width:60px;height:60px;border-radius:50%;background:#6F6B14;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 3px 8px rgba(60,45,20,.35)}\
.fcp-lo svg{width:34px;height:34px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}\
.fcp-h{font:700 22px/1.1 "Nunito Sans",sans-serif;text-align:center}.fcp-xp{font-size:16px;color:#4A4332;margin-top:4px;text-align:center}\
.fcp-box{align-self:stretch;background:rgba(255,255,255,.65);border-radius:16px;padding:12px 14px;display:flex;align-items:center;gap:12px}\
.fcp-box .fc-bm{margin:-6px 0 -6px -12px}\
.fcp-name{font:600 17px/1.1 Fraunces,Georgia,serif}.fcp-lvl{font:700 11px/1 "Nunito Sans",sans-serif;letter-spacing:.12em;margin-top:5px;color:var(--c)}\
.fcp-seg{display:flex;gap:4px;margin-top:8px}.fcp-seg i{flex:1;height:8px;border-radius:4px;background:rgba(0,0,0,.12)}.fcp-seg i.on{background:#E9A21C}\
.fcp-seg i.new{background:#E9A21C;box-shadow:0 0 0 2px #fff,0 0 8px 2px rgba(233,162,28,.8);animation:fcp-pulse 1.1s ease-in-out 3}\
@keyframes fcp-pulse{50%{box-shadow:0 0 0 2px #fff,0 0 14px 5px rgba(233,162,28,.95)}}\
.fcp-cnt{display:flex;justify-content:space-between;font:700 13px/1 "Nunito Sans",sans-serif;margin-top:7px}.fcp-cnt b{color:#2F7A2B}\
.fcp-up{align-self:stretch;text-align:center;border-radius:12px;background:#14301F;color:#F4C542;padding:9px;font:700 12px/1 "Nunito Sans",sans-serif;letter-spacing:.14em}\
.fcp-hint{font:700 13px/1.3 "Nunito Sans",sans-serif;color:#8A5A12;text-align:center}\
.fcp-go{align-self:stretch;margin:0 -6px;height:48px;border:0;border-radius:24px;background:#C2662F;color:#fff;font:700 16px/1 "Nunito Sans",sans-serif;cursor:pointer}';

  function prep() {
    if (document.getElementById('fcp-style')) return;
    if (global.FlaviaMarkers && typeof global.FlaviaMarkers.ensure === 'function') {
      global.FlaviaMarkers.ensure(); // garantit #ff-ic-loupe (sprite flavia-markers.js)
    }
    var st = document.createElement('style'); st.id = 'fcp-style'; st.textContent = CSS; document.head.appendChild(st);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Plus petit nombre de caches qui fait passer au niveau supérieur (null si niveau max)
  function nextThreshold(level, total) {
    for (var n = 1; n <= total; n++) if (FC.levelFor(n, total) > level) return n;
    return null;
  }

  function show(o) {
    if (!FC || !FC.COLLECTIONS[o.collection]) return;
    prep(); FC.mount();
    var c = FC.COLLECTIONS[o.collection], total = o.total, before = o.doneBefore || 0, after = Math.min(total, before + 1);
    var lvB = FC.levelFor(before, total), lvA = Math.max(1, FC.levelFor(after, total));
    var up = lvA > lvB && lvA >= 2;

    var seg = ''; for (var k = 0; k < total; k++) seg += '<i class="' + (k === after - 1 ? 'new' : k < after ? 'on' : '') + '"></i>';
    var hint;
    if (after >= total) hint = 'Collection complétée !';
    else {
      var nt = nextThreshold(lvA, total), left = nt - after;
      hint = left === 1 ? 'Encore 1 lieu pour passer ' + FC.LEVELS[lvA + 1] : 'Encore ' + left + ' lieux pour passer ' + FC.LEVELS[lvA + 1];
    }

    var ov = document.createElement('div'); ov.className = 'fcp-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = '<div class="fcp" style="--c:' + c.color + '">' +
      '<div class="fcp-lo"><svg aria-hidden="true"><use href="#ff-ic-loupe"/></svg></div>' +
      '<div><div class="fcp-h">Cache découverte !</div>' + (o.xp ? '<div class="fcp-xp">+' + o.xp + ' XP</div>' : '') + '</div>' +
      '<div class="fcp-box"><div class="fc-bm">' + FC.medal(o.collection, lvA, 67) + '</div><div style="flex:1;min-width:0">' +
        '<div class="fcp-name">' + esc(c.name) + '</div><div class="fcp-lvl">NIVEAU ' + lvA + ' · ' + FC.LEVELS[lvA].toUpperCase() + '</div>' +
        '<div class="fcp-seg">' + seg + '</div><div class="fcp-cnt"><span>' + after + ' / ' + total + ' découvertes</span><b>+1</b></div></div></div>' +
      (up ? '<div class="fcp-up">★ NOUVEAU NIVEAU : ' + FC.LEVELS[lvA].toUpperCase() + '</div>' : '') +
      '<div class="fcp-hint">' + esc(hint) + '</div>' +
      '<button class="fcp-go" type="button">Continuer</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('.fcp-go').addEventListener('click', function () { ov.remove(); if (o.onContinue) o.onContinue(); });
    return { level: lvA, levelUp: up, done: after };
  }
  global.FlaviaCachePopup = { show: show };
})(window);
