/* flavia-collections.js — médailles, bandeaux et fiche de lieu des collections (Récits d'Aventures)
 * Usage :
 *   FlaviaCollections.mount();                       // une fois : injecte styles + symboles
 *   FlaviaCollections.medal('terres', 2)             // HTML de la médaille
 *   FlaviaCollections.banner('terres', 2, 5, 15)     // bandeau (collection, niveau, validés, total)
 *   FlaviaCollections.card({collection:'terres', level:2, done:5, total:15,
 *       title:'Parc Haussmann', description:'…', distance:847, canValidate:false})
 *   FlaviaCollections.levelFor(done, total)          // niveau 0..5 selon la progression
 */
(function (global) {
  var COLLECTIONS = {
    pelerins:   { n: 1,  name: 'Sur la Route des Pèlerins',     color: '#2E6DA4', sym: 'e-pelerins' },
    chevaliers: { n: 2,  name: 'Sur les Pas des Chevaliers',    color: '#55606B', sym: 'e-chevaliers' },
    empire:     { n: 3,  name: "Les Vestiges de l'Empire",      color: '#7B2D5B', sym: 'e-empire' },
    premiers:   { n: 4,  name: "L'Énigme des Premiers Hommes",  color: '#7A5C2E', sym: 'e-premiers' },
    sources:    { n: 5,  name: 'Les Sources Cachées',           color: '#0E7490', sym: 'e-sources' },
    noms:       { n: 6,  name: 'Les Noms Gravés',               color: '#3A3F4B', sym: 'e-noms' },
    savoir:     { n: 7,  name: 'Les Portes du Savoir',          color: '#4B3E9E', sym: 'e-savoir' },
    terres:     { n: 8,  name: "Les Terres d'Exploration",      color: '#3F7D3A', sym: 'e-terres' },
    statues:    { n: 9,  name: "L'Énigme des Statues",          color: '#A64E7A', sym: 'e-statues' },
    inventions: { n: 10, name: 'Les Inventions Oubliées',       color: '#C2552B', sym: 'e-inventions' }
  };
  var LEVELS = [null, 'Éclaireur', 'Pisteur', 'Explorateur', 'Aventurier', 'Légende'];

  var SYMBOLS = '<symbol id="e-pelerins" viewBox="0 0 24 24"><path d="M12 1.4V4M10.7 2.7H13.3" stroke-width="1.3"/><path d="M12 3.8 15.4 9H8.6Z" fill="currentColor" stroke="none"/><rect x="9.2" y="8.6" width="5.6" height="12.4" fill="currentColor" stroke="none"/><path d="M3 21V13.6L9.2 11V21ZM21 21V13.6L14.8 11V21Z" fill="currentColor" stroke="none"/><path d="M10.8 21V17.6a1.2 1.2 0 0 1 2.4 0V21Z" style="fill:var(--c)" stroke="none"/><circle cx="12" cy="12.6" r="1.1" style="fill:var(--c)" stroke="none"/></symbol><symbol id="e-chevaliers" viewBox="0 0 24 24"><path d="M6.2 21V10.6C6.2 6.4 8.6 3.4 12 3.4S17.8 6.4 17.8 10.6V21Z" fill="currentColor" stroke="none"/><path d="M6.2 10.4H17.8M12 10.4V16.4" style="stroke:var(--c)" stroke-width="1.5"/><circle cx="9" cy="14.2" r=".7" style="fill:var(--c)" stroke="none"/><circle cx="15" cy="14.2" r=".7" style="fill:var(--c)" stroke="none"/><circle cx="9" cy="17.4" r=".7" style="fill:var(--c)" stroke="none"/><circle cx="15" cy="17.4" r=".7" style="fill:var(--c)" stroke="none"/></symbol><symbol id="e-empire" viewBox="0 0 24 24"><path d="M2 20.5V9.6C2 7.4 6.2 5.8 12 5.8S22 7.4 22 9.6V20.5Z" fill="currentColor" stroke="none"/><path d="M4.3 12.6V11.2a1.2 1.2 0 0 1 2.4 0V12.6ZM8.6 12.6V11.2a1.2 1.2 0 0 1 2.4 0V12.6ZM13 12.6V11.2a1.2 1.2 0 0 1 2.4 0V12.6ZM17.3 12.6V11.2a1.2 1.2 0 0 1 2.4 0V12.6ZM4.3 18.6V16.4a1.2 1.2 0 0 1 2.4 0V18.6ZM8.6 18.6V16.4a1.2 1.2 0 0 1 2.4 0V18.6ZM13 18.6V16.4a1.2 1.2 0 0 1 2.4 0V18.6ZM17.3 18.6V16.4a1.2 1.2 0 0 1 2.4 0V18.6Z" style="fill:var(--c)" stroke="none"/><path d="M2.4 14.7H21.6" style="stroke:var(--c)" stroke-width="1"/></symbol><symbol id="e-premiers" viewBox="0 0 24 24"><path d="M2.4 10.4 5 7.4H19.2L21.6 10.2V12.2H2.4Z" fill="currentColor" stroke="none"/><rect x="4.4" y="12.8" width="4.6" height="8" fill="currentColor" stroke="none"/><rect x="15" y="12.8" width="4.6" height="8" fill="currentColor" stroke="none"/><path d="M2 21.4H22" stroke-width="1.8"/></symbol><symbol id="e-sources" viewBox="0 0 24 24"><path d="M12 9.6V4.2M12 4.2C9.6 4.2 8 6 7.5 8.4M12 4.2C14.4 4.2 16 6 16.5 8.4" stroke-width="1.6"/><path d="M6.6 9.8H17.4C17.4 11.9 15.2 13 12 13S6.6 11.9 6.6 9.8Z" fill="currentColor" stroke="none"/><rect x="11" y="12.6" width="2" height="5.2" fill="currentColor" stroke="none"/><path d="M3 17.6H21V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" fill="currentColor" stroke="none"/></symbol><symbol id="e-noms" viewBox="0 0 24 24"><path d="M12 1.8 14.5 6.6 15.7 18.2H8.3L9.5 6.6Z" fill="currentColor" stroke="none"/><path d="M5.6 18.2H18.4V20.2H5.6ZM4.2 20.2H19.8V22H4.2Z" fill="currentColor" stroke="none"/><path d="M9.6 6.7H14.4M10.5 10.2H13.5M10.3 12.6H13.7M10.1 15H13.9" style="stroke:var(--c)" stroke-width=".9"/></symbol><symbol id="e-savoir" viewBox="0 0 24 24"><path d="M2.4 9.6 12 3.2 21.6 9.6Z" fill="currentColor" stroke="none"/><rect x="3.6" y="10.4" width="16.8" height="1.6" fill="currentColor" stroke="none"/><path d="M4.5 12.8H6.6V18.8H4.5ZM8.8 12.8H10.9V18.8H8.8ZM13.1 12.8H15.2V18.8H13.1ZM17.4 12.8H19.5V18.8H17.4Z" fill="currentColor" stroke="none"/><rect x="3.4" y="19.2" width="17.2" height="1.4" fill="currentColor" stroke="none"/><rect x="2.4" y="20.8" width="19.2" height="1.4" fill="currentColor" stroke="none"/></symbol><symbol id="e-terres" viewBox="0 0 24 24"><circle cx="12" cy="8.8" r="5.8" fill="currentColor" stroke="none"/><circle cx="7.4" cy="11.6" r="4" fill="currentColor" stroke="none"/><circle cx="16.6" cy="11.6" r="4" fill="currentColor" stroke="none"/><path d="M10.8 13.5H13.2V21H10.8Z" fill="currentColor" stroke="none"/><path d="M12 15.2 9.6 12.6M12 16.6 14.6 13.4" style="stroke:var(--c)" stroke-width="1.1"/><path d="M7 21.2H17" stroke-width="1.8"/></symbol><symbol id="e-statues" viewBox="0 0 24 24"><ellipse cx="12" cy="7.4" rx="3.4" ry="4.2" fill="currentColor" stroke="none"/><path d="M10.5 10.8H13.5V13.4H10.5Z" fill="currentColor" stroke="none"/><path d="M4.6 18.2C4.6 15.2 7.6 13.2 12 13.2S19.4 15.2 19.4 18.2Z" fill="currentColor" stroke="none"/><path d="M8.6 17.6C9.6 16.2 10.8 15.4 12 15.1" style="stroke:var(--c)" stroke-width=".9"/><path d="M6.4 19H17.6V21.4H6.4Z" fill="currentColor" stroke="none"/></symbol><symbol id="e-inventions" viewBox="0 0 24 24"><g fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6.6"/><rect x="10.3" y="2.4" width="3.4" height="19.2" rx="1"/><rect x="10.3" y="2.4" width="3.4" height="19.2" rx="1" transform="rotate(45 12 12)"/><rect x="10.3" y="2.4" width="3.4" height="19.2" rx="1" transform="rotate(90 12 12)"/><rect x="10.3" y="2.4" width="3.4" height="19.2" rx="1" transform="rotate(135 12 12)"/></g><circle cx="12" cy="12" r="2.8" style="fill:var(--c)" stroke="none"/></symbol><symbol id="laurel" viewBox="0 0 120 120"><g id="lau-l" fill="currentColor" stroke="none"><path d="M42.9 107A50 50 0 0 1 21.7 27.9" fill="none" stroke="currentColor" stroke-width="1.6"/><ellipse cx="33.5" cy="105.9" rx="7.5" ry="3" transform="rotate(-25 33.5 105.9)"/><ellipse cx="36.5" cy="100.7" rx="7.5" ry="3" transform="rotate(45 36.5 100.7)"/><ellipse cx="19.4" cy="94" rx="7.5" ry="3" transform="rotate(-45 19.4 94)"/><ellipse cx="24" cy="90.2" rx="7.5" ry="3" transform="rotate(25 24 90.2)"/><ellipse cx="10.2" cy="78.1" rx="7.5" ry="3" transform="rotate(-65 10.2 78.1)"/><ellipse cx="15.8" cy="76.1" rx="7.5" ry="3" transform="rotate(5 15.8 76.1)"/><ellipse cx="7" cy="60" rx="7.5" ry="3" transform="rotate(-85 7 60)"/><ellipse cx="13" cy="60" rx="7.5" ry="3" transform="rotate(-15 13 60)"/><ellipse cx="10.2" cy="41.9" rx="7.5" ry="3" transform="rotate(-105 10.2 41.9)"/><ellipse cx="15.8" cy="43.9" rx="7.5" ry="3" transform="rotate(-35 15.8 43.9)"/><ellipse cx="19.4" cy="26" rx="7.5" ry="3" transform="rotate(-125 19.4 26)"/><ellipse cx="24" cy="29.8" rx="7.5" ry="3" transform="rotate(-55 24 29.8)"/></g><use href="#lau-l" transform="translate(120 0) scale(-1 1)"/></symbol>';

  var CSS = '.fc-mw{position:relative;width:150px;height:170px;display:flex;align-items:flex-start;justify-content:center;padding-top:21px;box-sizing:border-box}\n\
.fc-md{position:relative;z-index:1;isolation:isolate;width:108px;height:108px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#F8EBD0;background:var(--ringbg);box-shadow:0 0 0 1.5px rgba(0,0,0,.35),0 6px 12px rgba(0,0,0,.35)}\n\
.fc-md::before{content:"";position:absolute;inset:8px;border-radius:50%;background:radial-gradient(circle at 35% 28%,color-mix(in srgb,var(--c) 62%,#fff) 0%,var(--c) 55%,color-mix(in srgb,var(--c) 68%,#000) 100%);z-index:-1;box-shadow:inset 0 2px 6px rgba(0,0,0,.4),0 0 0 1.5px rgba(0,0,0,.3)}\n\
.fc-md::after{position:absolute;right:-4px;bottom:-4px;width:28px;height:28px;border-radius:50%;background:#14301F;border:2px solid #F3E9CF;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:700 14px/1 Fraunces,Georgia,serif;color:#F3E9CF}\n\
.fc-l1{--ringbg:repeating-conic-gradient(#B8955C 0 7.5deg,#7A5A33 7.5deg 15deg)}\n\
.fc-l2{--ringbg:conic-gradient(from 200deg,#E3A06B,#9A5B2A,#D9965C,#7A4620,#E3A06B)}\n\
.fc-l3{--ringbg:conic-gradient(from 200deg,#F4F6F8,#9AA4AF,#E5E9ED,#7D8793,#F4F6F8)}\n\
.fc-l4{--ringbg:conic-gradient(from 200deg,#FBE29A,#C48A12,#F2C94C,#9C6E0C,#FBE29A)}\n\
.fc-l5{--ringbg:conic-gradient(from 200deg,#FFF0B8,#D9A21B,#FFE07A,#B27A0A,#FFF0B8)}\n\
.fc-l1 .fc-md::after{content:"1"}.fc-l2 .fc-md::after{content:"2"}.fc-l3 .fc-md::after{content:"3"}.fc-l4 .fc-md::after{content:"4"}.fc-l5 .fc-md::after{content:"5"}\n\
.fc-l5 .fc-md{box-shadow:0 0 0 1.5px rgba(0,0,0,.3),0 0 22px rgba(244,197,66,.75),0 6px 12px rgba(0,0,0,.35)}\n\
.fc-l4::before,.fc-l5::before{content:"★";position:absolute;top:0;left:50%;transform:translateX(-50%);font-size:20px;line-height:1;color:#F4C542;text-shadow:0 1px 2px rgba(0,0,0,.5);z-index:2}\n\
.fc-l5::before{font-size:26px;top:-3px;text-shadow:0 0 10px #FFE07A,0 1px 2px rgba(0,0,0,.5)}\n\
.fc-rb{position:absolute;left:75px;top:112px;width:0;height:0;z-index:0}\n\
.fc-rb::before,.fc-rb::after{content:"";position:absolute;top:0;width:26px;height:46px;background:color-mix(in srgb,var(--c) 72%,#000);clip-path:polygon(0 0,100% 0,100% 100%,50% 80%,0 100%);transform-origin:top center}\n\
.fc-rb::before{left:-30px;transform:rotate(14deg)}.fc-rb::after{left:4px;transform:rotate(-14deg)}\n\
.fc-lau{position:absolute;left:0;top:0;width:150px;height:150px;color:#E8B63C;z-index:0}\n\
.fc-em{width:54px;height:54px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}\n\
.fc-bw{filter:drop-shadow(0 3px 4px rgba(60,40,10,.4))}\n\
.fc-bd{position:relative;box-sizing:border-box;height:84px;display:flex;align-items:center;gap:12px;padding:0 54px 0 14px;color:#fff;font-family:\'Nunito Sans\',system-ui,sans-serif;background:linear-gradient(180deg,var(--c),color-mix(in srgb,var(--c) 78%,#000));overflow:hidden;clip-path:polygon(0 0,100% 0,calc(100% - 20px) 50%,100% 100%,0 100%)}\n\
.fc-bd.fc-flush{clip-path:none}\n\
.fc-bd::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.07) 0 2px,transparent 2px 10px);pointer-events:none}\n\
.fc-bm{flex:none;position:relative;width:93px;height:105px;margin:-6px 0 -6px -12px;display:flex;justify-content:center;overflow:visible}\n\
.fc-bt{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}\n\
.fc-bk{font-size:10px;font-weight:700;letter-spacing:.16em;color:rgba(255,255,255,.92);white-space:nowrap}\n\
.fc-bn{font-family:Fraunces,Georgia,serif;font-weight:600;font-size:18px;line-height:1.1}\n\
.fc-bp{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700}\n\
.fc-pb{flex:1;height:6px;border-radius:3px;background:rgba(0,0,0,.32);overflow:hidden}.fc-pb i{display:block;height:100%;background:#F4C542}\n\
.fc-card{position:relative;border-radius:18px;background:#E9D4A3 url(\'card-parchment.webp\') repeat;background-size:200px 200px;box-shadow:0 10px 30px rgba(20,30,15,.45);overflow:hidden;font-family:\'Nunito Sans\',system-ui,sans-serif}\n\
.fc-x{position:absolute;right:10px;top:10px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(0,0,0,.28);color:#fff;font:600 18px/1 sans-serif;cursor:pointer}\n\
.fc-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:10px}\n\
.fc-title{font:600 24px/1.1 Fraunces,Georgia,serif;color:#2B2616}\n\
.fc-pill{display:inline-block;padding:4px 10px;border-radius:12px;background:color-mix(in srgb,var(--c) 16%,#F4EEDC);color:color-mix(in srgb,var(--c) 80%,#000);font:700 12px/1 \'Nunito Sans\',sans-serif}\n\
.fc-desc{font-size:14px;line-height:1.45;color:#4A4332}\n\
.fc-hint{font-size:13px;font-weight:700;color:#8A5A12}\n\
.fc-cta{height:48px;border:0;border-radius:24px;background:#14301F;color:#F3E9CF;font:700 16px/1 \'Nunito Sans\',sans-serif;cursor:pointer}\n\
.fc-cta.fc-go{background:#E9A21C;color:#14301F}';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function mount() {
    if (document.getElementById('fc-style')) return;
    var st = document.createElement('style'); st.id = 'fc-style'; st.textContent = CSS; document.head.appendChild(st);
    var d = document.createElement('div'); d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = '<svg width="0" height="0" aria-hidden="true"><defs>' + SYMBOLS + '</defs></svg>';
    document.body.appendChild(d);
  }

  // Niveau selon la progression : 1 lieu → 1 ; 25 % → 2 ; 50 % → 3 ; 75 % → 4 ; 100 % → 5 ; 0 lieu → 0
  function levelFor(done, total) {
    if (!done) return 0;
    var p = done / total;
    if (p >= 1) return 5; if (p >= .75) return 4; if (p >= .5) return 3; if (p >= .25) return 2; return 1;
  }

  // Médaille seule. size = largeur en px (défaut 108 pour le disque ; ribbons/laurier débordent un peu).
  function medal(key, level, size) {
    var c = COLLECTIONS[key]; if (!c) return '';
    level = Math.max(1, Math.min(5, level || 1));
    var z = (size || 108) / 108;
    var h = '<div class="fc-mw fc-l' + level + '" style="--c:' + c.color + ';zoom:' + z + '">';
    if (level >= 3) h += '<i class="fc-rb"></i>';
    if (level === 5) h += '<svg class="fc-lau" aria-hidden="true"><use href="#laurel"/></svg>';
    h += '<div class="fc-md"><svg class="fc-em" aria-hidden="true"><use href="#' + c.sym + '"/></svg></div></div>';
    return h;
  }

  function bannerInner(key, level, done, total) {
    var c = COLLECTIONS[key], pct = total ? Math.round(100 * done / total) : 0;
    return '<div class="fc-bm">' + medal(key, level, 67) + '</div>' +
      '<div class="fc-bt"><div class="fc-bk">NIVEAU ' + level + ' · ' + LEVELS[level].toUpperCase() + '</div>' +
      '<div class="fc-bn">' + esc(c.name) + '</div>' +
      '<div class="fc-bp"><div class="fc-pb"><i style="width:' + pct + '%"></i></div>' + done + '/' + total + '</div></div>';
  }

  // Bandeau autonome (liste des collections, profil…)
  function banner(key, level, done, total) {
    var c = COLLECTIONS[key]; if (!c) return '';
    return '<div class="fc-bw"><div class="fc-bd" style="--c:' + c.color + '">' + bannerInner(key, level || 1, done, total) + '</div></div>';
  }

  // Fiche de lieu (variante A : bandeau en en-tête)
  // o = { collection, level, done, total, title, description, distance (m), canValidate, onClose via data-fc-close }
  function card(o) {
    var c = COLLECTIONS[o.collection]; if (!c) return '';
    var level = Math.max(1, o.level || 1);
    var cta = o.canValidate ? 'Valider ce lieu' : 'Rapproche-toi (' + o.distance + ' m)';
    var hint = o.canValidate ? '' : '<div class="fc-hint">Encore ' + o.distance + ' m pour pouvoir valider</div>';
    return '<div class="fc-card" style="--c:' + c.color + '">' +
      '<div class="fc-bd fc-flush">' + bannerInner(o.collection, level, o.done, o.total) + '</div>' +
      '<button class="fc-x" data-fc-close aria-label="Fermer">×</button>' +
      '<div class="fc-body"><div class="fc-title">' + esc(o.title) + '</div>' +
      (o.tag ? '<div><span class="fc-pill">' + esc(o.tag) + '</span></div>' : '') +
      '<div class="fc-desc">' + esc(o.description || '') + '</div>' + hint +
      '<button class="fc-cta' + (o.canValidate ? ' fc-go' : '') + '" data-fc-cta>' + cta + '</button></div></div>';
  }

  global.FlaviaCollections = { COLLECTIONS: COLLECTIONS, LEVELS: LEVELS, mount: mount, levelFor: levelFor, medal: medal, banner: banner, card: card };
})(window);
