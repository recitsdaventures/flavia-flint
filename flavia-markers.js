/*!
 * flavia-markers.js — marqueurs de carte Récits d'Aventures (Leaflet)
 * 9 catégories x 5 états (à découvrir, à proximité, découvert, verrouillé, groupe).
 * Aucune image : tout est en SVG + CSS, injecté automatiquement au premier usage.
 *
 * Dépendances : Leaflet 1.x (obligatoire), Leaflet.markercluster 1.5.x (pour les groupes).
 *
 * Usage rapide :
 *   var item = { lat: 43.5367, lng: 6.4647, category: 'tresor', title: 'Le coffre', done: false, locked: false };
 *   var state = FlaviaMarkers.computeState(item, userLatLng);        // 'discover' | 'near' | 'done' | 'locked'
 *   FlaviaMarkers.marker([item.lat, item.lng], item, state).addTo(map);
 *
 * Taille réduite le 27/10 (retour Firmin : les pastilles à 56/64/60px
 * prenaient trop de place sur la carte, se chevauchaient dès 2-3 marqueurs
 * proches) — toutes les dimensions ci-dessous sont à ~72% de l'original.
 */
(function (global) {
  'use strict';

  // ── Catégories : clé (à stocker en base) → libellé, couleur, pictogramme ──────────────
  var CATEGORIES = {
    chasses:      { label: 'Chasses de Flavia',   color: '#C2700A', icon: 'boussole' },
    exploration:  { label: 'Explorations',        color: '#A5442B', icon: 'chapeau'  },
    legende:      { label: 'Légendes & mystères', color: '#6B4FA0', icon: 'fantome'  },
    tresor:       { label: 'Trésors oubliés',     color: '#8B2332', icon: 'coffre'   },
    patrimoine:   { label: 'Patrimoine',          color: '#3B4A9C', icon: 'chateau'  },
    nature:       { label: 'Nature',              color: '#3F7D3A', icon: 'plante'   },
    eau:          { label: 'Eau',                 color: '#0E7490', icon: 'eau'      },
    art:          { label: 'Art & culture',       color: '#C03A84', icon: 'pinceau'  },
    savoir_faire: { label: 'Savoir-faire',        color: '#4B5563', icon: 'outil'    }
  };
  var DEFAULT_CATEGORY = 'chasses';          // utilisé si la catégorie est vide ou inconnue
  var MIXED = { label: 'Plusieurs catégories', color: '#14301F', icon: 'boussole' };
  var LOCKED_COLOR = '#7C8794';

  // ── Sprite SVG des pictogrammes (injecté une seule fois) ─────────────────────────────
  var SPRITE =
    '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<symbol id="ff-ic-boussole" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.2" stroke-width="2.2"/><g transform="rotate(32 12 12)"><path d="M12 3.6 15.4 12H8.6Z" fill="currentColor" stroke="none"/><path d="M12 20.4 8.6 12H15.4Z" stroke-width="1.7"/><circle cx="12" cy="12" r="2" fill="currentColor" style="stroke:var(--c,#14301F)" stroke-width="1"/></g></symbol>' +
    '<symbol id="ff-ic-chapeau" viewBox="0 0 24 24"><path d="M2 15.8C2 13.6 7 12.2 13 12.2C18 12.2 22 13.2 22.2 14.6C22.4 16.6 18 19 11.5 19C6 19 2 17.8 2 15.8Z" fill="currentColor" stroke="none"/><path d="M6.6 13.4C5.8 8 7.6 3.6 10.4 3.2C11.6 3 12.4 3.8 13.2 3.6C13.9 3.4 14.6 2.8 15.6 3.4C17.8 4.6 18.2 9 17.6 13.2C15 14.6 9.2 14.6 6.6 13.4Z" fill="currentColor" style="stroke:var(--c,#14301F)" stroke-width="1"/><path d="M6.7 11.2C9.6 12.6 14.8 12.6 17.7 10.9M6.7 12.9C9.6 14.1 14.8 14.1 17.6 12.6" fill="none" style="stroke:var(--c,#14301F)" stroke-width="1"/><path d="M9.4 4.6C11 6.1 14.2 5.6 15.7 4" fill="none" style="stroke:var(--c,#14301F)" stroke-width="1"/></symbol>' +
    '<symbol id="ff-ic-fantome" viewBox="0 0 24 24"><path d="M5.5 20.5V11a6.5 6.5 0 0 1 13 0v9.5l-2.5-2.2-2 2.2-2-2.2-2 2.2-2-2.2z"/><circle cx="9.5" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="11" r="1.1" fill="currentColor" stroke="none"/></symbol>' +
    '<symbol id="ff-ic-coffre" viewBox="0 0 24 24"><path d="M3 11V9.5a6 6 0 0 1 6-6h6a6 6 0 0 1 6 6V11Z" fill="currentColor" stroke="none"/><path d="M3 11.8H21V19.5a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5Z" fill="currentColor" stroke="none"/><rect x="10" y="9" width="4" height="5.4" rx="1.2" style="fill:var(--c,#14301F);stroke:currentColor" stroke-width="1.2"/><circle cx="12" cy="11.6" r=".9" fill="currentColor" stroke="none"/></symbol>' +
    '<symbol id="ff-ic-chateau" viewBox="0 0 24 24"><path d="M8.5 21V4H10.2V6H11.2V4H12.8V6H13.8V4H15.5V21Z" fill="currentColor" stroke="none"/><path d="M3 21V8H4.4V9.8H5.8V8H7.2V21Z" fill="currentColor" stroke="none"/><path d="M16.8 21V8H18.2V9.8H19.6V8H21V21Z" fill="currentColor" stroke="none"/><path d="M10.3 21V16.5a1.7 1.7 0 0 1 3.4 0V21Z" style="fill:var(--c,#14301F)" stroke="none"/><rect x="11.6" y="9" width=".8" height="3.2" style="fill:var(--c,#14301F)" stroke="none"/></symbol>' +
    '<symbol id="ff-ic-plante" viewBox="0 0 24 24"><path d="M12 21V12.5"/><path d="M12 14.5C7.2 14.8 4.5 12 4.5 7.8C9 7.8 12 10 12 14.5Z"/><path d="M12 12C12 7.2 14.6 4 19.5 4C19.5 8.6 16.6 12 12 12Z"/><path d="M8.5 21h7"/></symbol>' +
    '<symbol id="ff-ic-eau" viewBox="0 0 24 24"><path d="M12 3.5C12 3.5 5.5 10.3 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10.3 12 3.5 12 3.5z"/><path d="M9 15.2a3 3 0 0 0 3 3"/></symbol>' +
    '<symbol id="ff-ic-pinceau" viewBox="0 0 24 24"><path d="M19.8 4.2 12.6 11.4" stroke-width="2.8"/><path d="M10.6 12.4C8.2 12.2 6.6 13.8 6.4 16C6.2 17.8 5.2 19 3.8 19.6C7 20.8 10.8 20 12 16.8C12.8 14.8 12.4 13.2 10.6 12.4Z" fill="currentColor"/></symbol>' +
    '<symbol id="ff-ic-outil" viewBox="0 0 24 24"><g transform="rotate(40 12 12)"><rect x="6.5" y="3" width="11" height="5" rx="1.2" fill="currentColor"/><rect x="10.8" y="8" width="2.4" height="12.5" rx="1"/></g></symbol>' +
    '<symbol id="ff-ic-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-width="2.6"/></symbol>' +
    '<symbol id="ff-ic-lock" viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></symbol>' +
    '</defs></svg>';

  // ── Styles (tailles réduites le 27/10, voir note en tête de fichier) ─────────────────
  var CSS =
    '.ff-wrap{background:none!important;border:0!important}' +
    '.ff-mk{position:relative;width:40px;height:40px;border-radius:50%;background:var(--c);border:2px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);color:#fff;cursor:pointer;transition:transform .15s}' +
    '.ff-mk:hover{transform:scale(1.08)}' +
    '.ff-ic{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
    '.ff-near{width:46px;height:46px;box-shadow:0 0 0 5px color-mix(in srgb,var(--c) 35%,transparent),0 0 0 10px color-mix(in srgb,var(--c) 16%,transparent)}' +
    '.ff-near .ff-ic{width:27px;height:27px}' +
    '.ff-near::after{content:"";position:absolute;inset:-3px;border-radius:50%;border:2px solid var(--c);animation:ff-pulse 1.8s ease-out infinite;pointer-events:none}' +
    '@keyframes ff-pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.9);opacity:0}}' +
    '@media (prefers-reduced-motion:reduce){.ff-near::after{animation:none;display:none}}' +
    '.ff-group{width:43px;height:43px;box-shadow:6px 4px 0 -1px var(--c),6px 4px 0 1px #fff,0 2px 6px rgba(0,0,0,.35)}' +
    '.ff-group .ff-ic{width:24px;height:24px}' +
    '.ff-bdg{position:absolute;top:-6px;right:-6px;width:17px;height:17px;border-radius:50%;box-sizing:border-box;border:1.5px solid #fff;display:flex;align-items:center;justify-content:center;font:700 10px/1 Georgia,serif}' +
    '.ff-bdg .ff-ic{width:10px;height:10px}' +
    '.ff-ok,.ff-n{background:#E9A21C;color:#14301F}' +
    '.ff-lk{background:#fff;border-color:#7C8794;color:#4B5563}';

  var ready = false;
  function ensure() {
    if (ready || typeof document === 'undefined') return;
    var st = document.createElement('style');
    st.id = 'ff-marker-styles';
    st.textContent = CSS;
    document.head.appendChild(st);
    var host = document.body || document.documentElement;
    host.insertAdjacentHTML('afterbegin', SPRITE);
    ready = true;
  }

  function svg(name) {
    return '<svg class="ff-ic" aria-hidden="true"><use href="#ff-ic-' + name + '"/></svg>';
  }

  function lookup(cat) {
    if (cat === '_mixed') return MIXED;
    return CATEGORIES[cat] || CATEGORIES[DEFAULT_CATEGORY];
  }

  function html(cat, state, count) {
    var c = lookup(cat);
    var color = state === 'locked' ? LOCKED_COLOR : c.color;
    var badge = '';
    if (state === 'done') badge = '<span class="ff-bdg ff-ok">' + svg('check') + '</span>';
    else if (state === 'locked') badge = '<span class="ff-bdg ff-lk">' + svg('lock') + '</span>';
    else if (state === 'group') badge = '<span class="ff-bdg ff-n">' + (count > 99 ? '99+' : count) + '</span>';
    return '<div class="ff-mk ff-' + state + '" style="--c:' + color + '">' + svg(c.icon) + badge + '</div>';
  }

  // state : 'discover' | 'near' | 'done' | 'locked' | 'group'
  function icon(cat, state, count) {
    ensure();
    var size = state === 'near' ? 46 : state === 'group' ? 43 : 40;
    return L.divIcon({
      className: 'ff-wrap',
      html: html(cat, state || 'discover', count),
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  // item : { lat, lng, category, title, done, locked, radiusM }
  function computeState(item, userLatLng, opts) {
    opts = opts || {};
    if (item.locked) return 'locked';
    if (item.done) return 'done';
    if (userLatLng && item.lat != null && item.lng != null) {
      var d = L.latLng(item.lat, item.lng).distanceTo(L.latLng(userLatLng));
      if (d <= (item.radiusM || opts.nearMeters || 150)) return 'near';
    }
    return 'discover';
  }

  function marker(latlng, item, state, options) {
    var o = L.Util.extend({
      icon: icon(item.category, state),
      title: item.title || (lookup(item.category).label),
      alt: item.title || lookup(item.category).label,
      keyboard: true,
      ffCategory: item.category || DEFAULT_CATEGORY,
      ffState: state
    }, options || {});
    return L.marker(latlng, o);
  }

  // À passer à L.markerClusterGroup({ iconCreateFunction: FlaviaMarkers.clusterIcon })
  function clusterIcon(cluster) {
    var kids = cluster.getAllChildMarkers();
    var cats = {};
    kids.forEach(function (m) { cats[m.options.ffCategory || DEFAULT_CATEGORY] = true; });
    var keys = Object.keys(cats);
    return icon(keys.length === 1 ? keys[0] : '_mixed', 'group', kids.length);
  }

  global.FlaviaMarkers = {
    CATEGORIES: CATEGORIES,
    icon: icon,
    marker: marker,
    computeState: computeState,
    clusterIcon: clusterIcon,
    ensure: ensure
  };
})(window);
