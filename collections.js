/* ============================================================
   Collections — fenêtre « Mes collections » + détail + bouton carte
   Récits d'Aventures · vanilla JS, Supabase REST (fetch), Leaflet
   Fourni par Firmin, adapté le 08/11 au schéma réel de l'app (pas de tables
   collection_places/player_collection_places séparées comme prévu par le
   fichier d'origine : on lit directement virtual_caches + cache_discoveries
   pour les caches, et adventures + adventure_completions pour les aventures
   "Trésors oubliés" rattachées à une collection via adventures.collection_id —
   même logique que getCollectionProgress() dans index.html).
   ============================================================ */
(function(){
'use strict';

/* ---------- 1. CONFIG : surchargée depuis index.html (voir l'appel init()) ---------- */
const CFG = {
  url:   () => window.SUPABASE_URL,
  key:   () => window.SUPABASE_ANON_KEY,
  token: () => localStorage.getItem('sb_access_token') || null,
  userId:() => localStorage.getItem('sb_user_id') || null,
  // Tables réelles de l'app (schéma Supabase qvxbkidbubvaqlonqmpu)
  T: {
    collections: 'collections',               // id, name, description, status, badge_*_threshold
    caches:      'virtual_caches',             // id, collection_id, title, lat, lng, status
    adventures:  'adventures',                 // id, collection_id, title, main_lat, main_lng, status
    cacheDiscoveries:     'cache_discoveries',          // player_id, cache_id, discovered_at
    adventureCompletions: 'adventure_completions'       // player_id, adventure_id, completed_at
  },
  // Conteneur de la carte où poser le bouton (le parent de la carte Leaflet)
  mapContainer: () => document.getElementById('map') ? document.getElementById('map').parentElement : document.body,
  // Instance Leaflet (pour « Voir sur la carte »), facultatif
  leaflet: () => window.map || null,
  demo: false   // true = données d'exemple, sans Supabase
};
const LEVELS = ['','Éclaireur','Pisteur','Explorateur','Aventurier','Légende'];
const RING = [
 'conic-gradient(from 200deg,#CFC8B4,#9B957F,#CFC8B4)',
 'conic-gradient(from 200deg,#B07A45,#6B4423,#A06A38,#5A3818,#B07A45)',
 'conic-gradient(from 200deg,#F0B97C,#A5622A,#E2A468,#7F4519,#F0B97C)',
 'conic-gradient(from 200deg,#FFFFFF,#9AA3AB,#E4E8EB,#7B858D,#FFFFFF)',
 'conic-gradient(from 200deg,#FBE29A,#C48A12,#F2C94C,#9C6E0C,#FBE29A)',
 'conic-gradient(from 200deg,#FFF1B8,#D79A0E,#FFE27A,#A87208,#FFF1B8)'];

// Correspondance nom de collection (table `collections`) → clé d'emblème du
// sprite (e-pelerins, e-chevaliers, ...) et couleur — DOIT rester synchronisée
// avec FLAVIA_COLLECTION_KEY_BY_NAME dans index.html si une 11e collection
// est créée un jour.
const SLUG_BY_NAME = {
  'Sur la Route des Pèlerins': 'pelerins',
  'Sur les Pas des Chevaliers': 'chevaliers',
  "Les Vestiges de l'Empire": 'empire',
  "L'Énigme des Premiers Hommes": 'premiers',
  'Les Sources Cachées': 'sources',
  'Les Noms Gravés': 'noms',
  'Les Portes du Savoir': 'savoir',
  "Les Terres d'Exploration": 'terres',
  "L'Énigme des Statues": 'statues',
  'Les Inventions Oubliées': 'inventions'
};
const COLOR_BY_SLUG = {
  pelerins:'#2E6DA4', chevaliers:'#55606B', empire:'#7B2D5B', premiers:'#7A5C2E',
  sources:'#0E7490', noms:'#3A3F4B', savoir:'#4B3E9E', terres:'#3F7D3A',
  statues:'#A64E7A', inventions:'#C2552B'
};

/* ---------- 2. DONNÉES ---------- */
async function rest(path){
  const r = await fetch(CFG.url()+'/rest/v1/'+path, {headers:{apikey:CFG.key(), Authorization:'Bearer '+(CFG.token()||CFG.key())}});
  if(!r.ok) throw new Error('Supabase '+r.status);
  return r.json();
}
function demoData(){
  const C=[['pelerins','Sur la Route des Pèlerins','Édifices religieux','#2E6DA4',12,7],['chevaliers','Sur les Pas des Chevaliers','Vestiges médiévaux','#55606B',9,2],['empire',"Les Vestiges de l'Empire",'Antiquité, Rome','#7B2D5B',10,0],['premiers',"L'Énigme des Premiers Hommes",'Préhistoire, mégalithes','#7A5C2E',8,8],['sources','Les Sources Cachées','Fontaines, lavoirs','#0E7490',11,3],['noms','Les Noms Gravés','Monuments aux morts','#3A3F4B',14,1],['savoir','Les Portes du Savoir','Musées','#4B3E9E',8,4],['terres',"Les Terres d'Exploration",'Parcs et jardins','#3F7D3A',15,12],['statues',"L'Énigme des Statues",'Sculptures','#A64E7A',12,0],['inventions','Les Inventions Oubliées','Curiosités, insolite','#C2552B',7,2]];
  return C.map(([slug,name,subtitle,color,t,v])=>({slug,name,subtitle,color,total:t,places:Array.from({length:t},(_,i)=>({id:slug+i,name:'Lieu '+(i+1),lat:43.53+i*.002,lng:6.46+i*.002,done:i<v,date:i<v?'2026-10-'+String(10+i).padStart(2,'0'):null}))}));
}
async function load(){
  if(CFG.demo) return demoData();
  const uid = CFG.userId();
  const [cols, caches, advs, discRows, compRows] = await Promise.all([
    rest(CFG.T.collections+'?select=*&order=name.asc'),
    rest(CFG.T.caches+'?select=id,collection_id,title,lat,lng&status=eq.published'),
    rest(CFG.T.adventures+'?select=id,collection_id,title,main_lat,main_lng&status=eq.published'),
    uid ? rest(CFG.T.cacheDiscoveries+'?select=cache_id,discovered_at&player_id=eq.'+uid) : Promise.resolve([]),
    uid ? rest(CFG.T.adventureCompletions+'?select=adventure_id,completed_at&player_id=eq.'+uid) : Promise.resolve([])
  ]);
  const doneCache = new Map(discRows.map(r=>[r.cache_id, r.discovered_at]));
  const doneAdv   = new Map(compRows.map(r=>[r.adventure_id, r.completed_at]));
  return cols
    .map(c=>{
      const slug = SLUG_BY_NAME[c.name] || c.id;
      const placesFromCaches = caches.filter(p=>p.collection_id===c.id).map(p=>({
        id:'c-'+p.id, name:p.title, lat:p.lat, lng:p.lng,
        done: doneCache.has(p.id), date: doneCache.get(p.id) || null
      }));
      const placesFromAdv = advs.filter(a=>a.collection_id===c.id).map(a=>({
        id:'a-'+a.id, name:a.title, lat:a.main_lat, lng:a.main_lng,
        done: doneAdv.has(a.id), date: doneAdv.get(a.id) || null
      }));
      const places = placesFromCaches.concat(placesFromAdv);
      return {
        slug, name: c.name, subtitle: c.description || '',
        color: COLOR_BY_SLUG[slug] || '#2E6DA4',
        total: places.length, places
      };
    })
    // Masque les collections encore vides (aucun lieu/aventure rattaché) —
    // ex. "L'Énigme des Statues" au 08/11 — plutôt que d'afficher une carte
    // "0/0" cassée (barre de progression à NaN%).
    .filter(c => c.total > 0);
}

/* ---------- 3. NIVEAUX ---------- */
const thr = t => [1,Math.ceil(.25*t),Math.ceil(.5*t),Math.ceil(.75*t),t];
function level(v,t){ if(!v) return 0; let L=0; thr(t).forEach((x,i)=>{ if(v>=x) L=i+1; }); return L; }
function nextText(v,t){ const L=level(v,t); if(L===5) return 'Collection complète'; const d=thr(t)[L]-v; return '+'+d+' lieu'+(d>1?'x':'')+' → '+LEVELS[L+1]; }
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ico = (id,s,extra) => '<svg class="rda-ic" style="width:'+s+'px;height:'+s+'px;'+(extra||'')+'"><use href="#'+id+'"/></svg>';

/* ---------- 4. COMPOSANTS HTML ---------- */
function emblem(c,L,size){
  const inner=Math.round(size*.8), ic=Math.round(size*.46);
  const core = L===0 ? 'background:#D8D0BC;color:#9B957F;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)'
    : 'background:radial-gradient(circle at 35% 28%,color-mix(in srgb,'+c.color+' 62%,#fff),'+c.color+' 55%,color-mix(in srgb,'+c.color+' 68%,#000));color:#F8EBD0;box-shadow:inset 0 2px 6px rgba(0,0,0,.4)';
  const star = L===5 ? '<div class="rda-star" style="width:'+Math.round(size*.3)+'px;height:'+Math.round(size*.3)+'px;font-size:'+Math.round(size*.15)+'px">★</div>' : '';
  return '<div class="rda-em" style="width:'+size+'px;height:'+size+'px;background:'+RING[L]+'"><div style="width:'+inner+'px;height:'+inner+'px;border-radius:50%;display:flex;align-items:center;justify-content:center;'+core+'">'+ico('e-'+c.slug,ic,L===0?'opacity:.65':'stroke-width:1.6')+'</div>'+star+'</div>';
}
function chip(L,c){
  if(!L) return '<span class="rda-lv rda-lv0">'+ico('rda-lock',11,'stroke-width:2.2')+' À débloquer</span>';
  return '<span class="rda-lv" style="background:color-mix(in srgb,'+c.color+' 16%,#FBF6E8);color:color-mix(in srgb,'+c.color+' 85%,#000)">'+LEVELS[L]+'</span>';
}
function bar(v,t,color){
  const ticks=thr(t).slice(1,4).map(x=>'<u style="left:calc('+(x/t*100).toFixed(1)+'% - 1px)"></u>').join('');
  return '<div class="rda-bar"><i style="width:'+(v/t*100).toFixed(1)+'%;background:'+color+'"></i>'+ticks+'</div>';
}
function card(c,i){
  const v=c.places.filter(p=>p.done).length, t=c.total, L=level(v,t);
  return '<button class="rda-card'+(L===0?' rda-locked':'')+'" data-i="'+i+'">'+emblem(c,L,70)+'<div class="rda-cn">'+esc(c.name)+'</div>'+chip(L,c)+
    '<div class="rda-prog">'+bar(v,t,c.color)+'<span class="rda-sm">'+v+'/'+t+' lieux</span><span class="rda-nx">'+nextText(v,t)+'</span></div></button>';
}

/* ---------- 5. ÉCRANS ---------- */
let DATA=[], root, body, userPos=null;
function viewList(){
  const total=DATA.length*5, lv=DATA.reduce((a,c)=>a+level(c.places.filter(p=>p.done).length,c.total),0);
  const started=DATA.filter(c=>c.places.some(p=>p.done)).length, full=DATA.filter(c=>c.total&&c.places.every(p=>p.done)).length;
  body.innerHTML=
   '<div class="rda-head"><div class="rda-grip"></div><h2>Mes collections</h2><p>'+DATA.length+' collections à compléter, de Éclaireur à Légende</p><button class="rda-x" data-close aria-label="Fermer">×</button></div>'+
   '<div class="rda-scroll"><div class="rda-sum"><div class="rda-sumic">'+ico('rda-trophy',30)+'</div><div style="flex:1;min-width:0"><b>'+lv+' niveaux sur '+total+'</b><small>'+started+' collection'+(started>1?'s':'')+' entamée'+(started>1?'s':'')+' · '+full+' complète'+(full>1?'s':'')+'</small><div class="rda-sumbar"><div style="width:'+(total?lv/total*100:0).toFixed(0)+'%"></div></div></div></div>'+
   '<div class="rda-grid">'+DATA.map(card).join('')+'</div></div>';
  body.querySelectorAll('.rda-card').forEach(b=>b.onclick=()=>viewDetail(+b.dataset.i));
}
function dist(a,b){ const R=6371e3,r=Math.PI/180,dl=(b.lat-a.lat)*r,dg=(b.lng-a.lng)*r,x=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dg/2)**2; return 2*R*Math.asin(Math.sqrt(x)); }
const fmtD = m => m<1000 ? Math.round(m/10)*10+' m' : (m/1000).toFixed(1).replace('.',',')+' km';
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR',{day:'numeric',month:'short'}) : '';
function viewDetail(i){
  const c=DATA[i], v=c.places.filter(p=>p.done).length, t=c.total, L=level(v,t), th=thr(t);
  const steps=th.map((x,j)=>{ const on=j+1<=L, cur=j+1===L;
    return '<div class="rda-step"><div class="rda-dot'+(cur?' cur':'')+'" style="background:'+(on?RING[j+1]:'#E3DCC8')+';color:'+(on?'#fff':'#A89F86')+';--c:'+c.color+'">'+(on?ico('rda-check',cur?16:15,'stroke-width:2.6'):(j+1))+'</div><div class="rda-sn'+(on?' on':'')+'">'+LEVELS[j+1]+'</div><div class="rda-sl">'+x+' lieu'+(x>1?'x':'')+'</div></div>'; }).join('');
  const done=c.places.filter(p=>p.done).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const todo=c.places.filter(p=>!p.done).map(p=>({p,d:userPos&&p.lat!=null?dist(userPos,p):null})).sort((a,b)=>(a.d??1e12)-(b.d??1e12));
  const rows=
    done.slice(0,3).map(p=>'<div class="rda-row"><span class="rda-ck" style="background:'+c.color+'">'+ico('rda-check',14,'stroke-width:2.8')+'</span><div class="rda-rn">'+esc(p.name)+'</div><span class="rda-rd">'+fmtDate(p.date)+'</span></div>').join('')+
    (done.length>3?'<div class="rda-row" style="opacity:.8"><span class="rda-ck" style="background:'+c.color+'">'+ico('rda-check',14,'stroke-width:2.8')+'</span><div class="rda-rn">+ '+(done.length-3)+' autre'+(done.length-3>1?'s':'')+' lieu'+(done.length-3>1?'x':'')+' validé'+(done.length-3>1?'s':'')+'</div></div>':'')+
    todo.slice(0,4).map(o=>'<div class="rda-row"><span class="rda-ck rda-ckl">'+ico('rda-lock',13,'stroke-width:2.2')+'</span><div class="rda-rn rda-mut">Lieu à découvrir</div>'+(o.d!=null?'<span class="rda-rdist" style="color:'+c.color+'">'+ico('rda-pin',12)+fmtD(o.d)+'</span>':'')+'</div>').join('')+
    (todo.length>4?'<div class="rda-more">et '+(todo.length-4)+' autre'+(todo.length-4>1?'s':'')+' à découvrir</div>':'');
  body.innerHTML=
   '<div class="rda-head rda-head2"><div class="rda-grip"></div><button class="rda-back" data-back>'+ico('rda-back',18)+'Collections</button><button class="rda-x" data-close aria-label="Fermer">×</button></div>'+
   '<div class="rda-scroll"><div class="rda-top">'+emblem(c,L,92)+'<div style="flex:1;min-width:0"><h3>'+esc(c.name)+'</h3><div class="rda-sub">'+esc(c.subtitle)+' · '+t+' lieux</div>'+chip(L,c)+'</div></div>'+
   '<div class="rda-box"><div class="rda-line"><span class="rda-big" style="color:'+c.color+'">'+v+'<small> / '+t+' lieux</small></span><span class="rda-nx2">'+nextText(v,t)+'</span></div>'+bar(v,t,c.color)+'<div class="rda-steps">'+steps+'</div></div>'+
   '<div class="rda-lab">LIEUX DE LA COLLECTION</div><div class="rda-rows">'+rows+'</div></div>'+
   '<div class="rda-foot"><button class="rda-cta" data-map>'+ico('rda-pin',18)+'Voir sur la carte</button></div>';
  body.querySelector('[data-back]').onclick=viewList;
  body.querySelector('[data-map]').onclick=()=>{ close(); const m=CFG.leaflet(), pts=todo.map(o=>o.p).concat(done).filter(p=>p.lat!=null).map(p=>[p.lat,p.lng]); if(m&&pts.length&&window.L) m.fitBounds(pts,{padding:[40,40],maxZoom:16}); document.dispatchEvent(new CustomEvent('rda:collection-map',{detail:{slug:c.slug}})); };
}

/* ---------- 6. OUVERTURE / FERMETURE ---------- */
function close(){ root.classList.remove('open'); document.body.classList.remove('rda-noscroll'); }
async function open(){
  root.classList.add('open'); document.body.classList.add('rda-noscroll');
  body.innerHTML='<div class="rda-load">Chargement…</div>';
  try{ DATA=await load(); viewList(); }
  catch(e){ console.error(e); body.innerHTML='<div class="rda-head"><button class="rda-x" data-close>×</button></div><div class="rda-load">Impossible de charger les collections.<br><small>'+esc(e.message)+'</small></div>'; }
  if(navigator.geolocation) navigator.geolocation.getCurrentPosition(p=>{ userPos={lat:p.coords.latitude,lng:p.coords.longitude}; },()=>{},{maximumAge:60000,timeout:4000});
}

/* ---------- 7. INIT ---------- */
function init(opts){
  Object.assign(CFG,opts||{});
  if(document.getElementById('rda-coll-root')) return;
  const sp=document.createElement('div'); sp.innerHTML='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'+SPRITE+'</defs></svg>'; document.body.appendChild(sp.firstChild);
  root=document.createElement('div'); root.id='rda-coll-root';
  root.innerHTML='<div class="rda-back-d" data-close></div><div class="rda-sheet" role="dialog" aria-modal="true" aria-label="Collections"><div id="rda-body"></div></div>';
  document.body.appendChild(root); body=root.querySelector('#rda-body');
  root.addEventListener('click',e=>{ if(e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') close(); });
  // bouton sur la carte
  const b=document.createElement('button'); b.id='rda-coll-btn'; b.type='button';
  b.innerHTML=ico('rda-trophy',24,'color:#4B3E9E')+'<span>Collections</span><em id="rda-coll-count"></em>';
  b.onclick=open; (CFG.mapContainer()||document.body).appendChild(b);
  if(getComputedStyle(b.parentElement).position==='static') b.parentElement.style.position='relative';
  // compteur « 8/10 » (silencieux si échec)
  if(!CFG.demo) load().then(d=>{ DATA=d; const n=d.filter(c=>c.places.some(p=>p.done)).length; document.getElementById('rda-coll-count').textContent=n+'/'+d.length; }).catch(()=>{ document.getElementById('rda-coll-count').remove(); });
  else { DATA=demoData(); document.getElementById('rda-coll-count').textContent=DATA.filter(c=>c.places.some(p=>p.done)).length+'/'+DATA.length; }
}
const SPRITE = `<symbol id="e-pelerins" viewBox="0 0 24 24"><path d="M12 1.4V4M10.7 2.7H13.3" stroke-width="1.3"/><path d="M12 3.8 15.4 9H8.6Z" fill="currentColor" stroke="none"/><rect x="9.2" y="8.6" width="5.6" height="12.4" fill="currentColor" stroke="none"/><path d="M3 21V13.6L9.2 11V21ZM21 21V13.6L14.8 11V21Z" fill="currentColor" stroke="none"/><path d="M10.8 21V17.6a1.2 1.2 0 0 1 2.4 0V21Z" style="fill:var(--rda-bg,#14301F)" stroke="none"/><circle cx="12" cy="12.6" r="1.1" style="fill:var(--rda-bg,#14301F)" stroke="none"/></symbol><symbol id="e-chevaliers" viewBox="0 0 24 24"><path d="M6.2 21V10.6C6.2 6.4 8.6 3.4 12 3.4S17.8 6.4 17.8 10.6V21Z" fill="currentColor" stroke="none"/><path d="M6.2 10.4H17.8M12 10.4V16.4" style="stroke:var(--rda-bg,#14301F)" stroke-width="1.5"/><circle cx="9" cy="14.2" r=".7" style="fill:var(--rda-bg,#14301F)" stroke="none"/><circle cx="15" cy="14.2" r=".7" style="fill:var(--rda-bg,#14301F)" stroke="none"/><circle cx="9" cy="17.4" r=".7" style="fill:var(--rda-bg,#14301F)" stroke="none"/><circle cx="15" cy="17.4" r=".7" style="fill:var(--rda-bg,#14301F)" stroke="none"/></symbol><symbol id="e-empire" viewBox="0 0 24 24"><path d="M2 20.5V9.6C2 7.4 6.2 5.8 12 5.8S22 7.4 22 9.6V20.5Z" fill="currentColor" stroke="none"/><path d="M4.3 12.6V11.2a1.2 1.2 0 0 1 2.4 0V12.6ZM8.6 12.6V11.2a1.2 1.2 0 0 1 2.4 0V12.6ZM13 12.6V11.2a1.2 1.2 0 0 1 2.4 0V12.6ZM17.3 12.6V11.2a1.2 1.2 0 0 1 2.4 0V12.6ZM4.3 18.6V16.4a1.2 1.2 0 0 1 2.4 0V18.6ZM8.6 18.6V16.4a1.2 1.2 0 0 1 2.4 0V18.6ZM13 18.6V16.4a1.2 1.2 0 0 1 2.4 0V18.6ZM17.3 18.6V16.4a1.2 1.2 0 0 1 2.4 0V18.6Z" style="fill:var(--rda-bg,#14301F)" stroke="none"/><path d="M2.4 14.7H21.6" style="stroke:var(--rda-bg,#14301F)" stroke-width="1"/></symbol><symbol id="e-premiers" viewBox="0 0 24 24"><path d="M2.4 10.4 5 7.4H19.2L21.6 10.2V12.2H2.4Z" fill="currentColor" stroke="none"/><rect x="4.4" y="12.8" width="4.6" height="8" fill="currentColor" stroke="none"/><rect x="15" y="12.8" width="4.6" height="8" fill="currentColor" stroke="none"/><path d="M2 21.4H22" stroke-width="1.8"/></symbol><symbol id="e-sources" viewBox="0 0 24 24"><path d="M12 9.6V4.2M12 4.2C9.6 4.2 8 6 7.5 8.4M12 4.2C14.4 4.2 16 6 16.5 8.4" stroke-width="1.6"/><path d="M6.6 9.8H17.4C17.4 11.9 15.2 13 12 13S6.6 11.9 6.6 9.8Z" fill="currentColor" stroke="none"/><rect x="11" y="12.6" width="2" height="5.2" fill="currentColor" stroke="none"/><path d="M3 17.6H21V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" fill="currentColor" stroke="none"/></symbol><symbol id="e-noms" viewBox="0 0 24 24"><path d="M12 1.8 14.5 6.6 15.7 18.2H8.3L9.5 6.6Z" fill="currentColor" stroke="none"/><path d="M5.6 18.2H18.4V20.2H5.6ZM4.2 20.2H19.8V22H4.2Z" fill="currentColor" stroke="none"/><path d="M9.6 6.7H14.4M10.5 10.2H13.5M10.3 12.6H13.7M10.1 15H13.9" style="stroke:var(--rda-bg,#14301F)" stroke-width=".9"/></symbol><symbol id="e-savoir" viewBox="0 0 24 24"><path d="M2.4 9.6 12 3.2 21.6 9.6Z" fill="currentColor" stroke="none"/><rect x="3.6" y="10.4" width="16.8" height="1.6" fill="currentColor" stroke="none"/><path d="M4.5 12.8H6.6V18.8H4.5ZM8.8 12.8H10.9V18.8H8.8ZM13.1 12.8H15.2V18.8H13.1ZM17.4 12.8H19.5V18.8H17.4Z" fill="currentColor" stroke="none"/><rect x="3.4" y="19.2" width="17.2" height="1.4" fill="currentColor" stroke="none"/><rect x="2.4" y="20.8" width="19.2" height="1.4" fill="currentColor" stroke="none"/></symbol><symbol id="e-terres" viewBox="0 0 24 24"><circle cx="12" cy="8.8" r="5.8" fill="currentColor" stroke="none"/><circle cx="7.4" cy="11.6" r="4" fill="currentColor" stroke="none"/><circle cx="16.6" cy="11.6" r="4" fill="currentColor" stroke="none"/><path d="M10.8 13.5H13.2V21H10.8Z" fill="currentColor" stroke="none"/><path d="M12 15.2 9.6 12.6M12 16.6 14.6 13.4" style="stroke:var(--rda-bg,#14301F)" stroke-width="1.1"/><path d="M7 21.2H17" stroke-width="1.8"/></symbol><symbol id="e-statues" viewBox="0 0 24 24"><ellipse cx="12" cy="7.4" rx="3.4" ry="4.2" fill="currentColor" stroke="none"/><path d="M10.5 10.8H13.5V13.4H10.5Z" fill="currentColor" stroke="none"/><path d="M4.6 18.2C4.6 15.2 7.6 13.2 12 13.2S19.4 15.2 19.4 18.2Z" fill="currentColor" stroke="none"/><path d="M8.6 17.6C9.6 16.2 10.8 15.4 12 15.1" style="stroke:var(--rda-bg,#14301F)" stroke-width=".9"/><path d="M6.4 19H17.6V21.4H6.4Z" fill="currentColor" stroke="none"/></symbol><symbol id="e-inventions" viewBox="0 0 24 24"><g fill="currentColor" stroke="none"><circle cx="12" cy="12" r="6.6"/><rect x="10.3" y="2.4" width="3.4" height="19.2" rx="1"/><rect x="10.3" y="2.4" width="3.4" height="19.2" rx="1" transform="rotate(45 12 12)"/><rect x="10.3" y="2.4" width="3.4" height="19.2" rx="1" transform="rotate(90 12 12)"/><rect x="10.3" y="2.4" width="3.4" height="19.2" rx="1" transform="rotate(135 12 12)"/></g><circle cx="12" cy="12" r="2.8" style="fill:var(--rda-bg,#14301F)" stroke="none"/></symbol><symbol id="rda-trophy" viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5"/><path d="M12 14v3.5M8.5 20h7M9.5 17.5h5"/></symbol><symbol id="rda-lock" viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></symbol><symbol id="rda-check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol><symbol id="rda-pin" viewBox="0 0 24 24"><path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></symbol><symbol id="rda-back" viewBox="0 0 24 24"><path d="M14.5 5.5 8 12l6.5 6.5"/></symbol>`;
window.RDACollections = { init, open, close };
})();
