const CACHE_NAME = 'flavia-flint-v5';

// App shell + arrière-plans/parchemins vus dès le splash, l'inscription et
// l'accueil — précachés à l'installation du service worker pour qu'ils
// soient prêts avant même que l'écran correspondant ne les demande, au lieu
// d'attendre le premier accès de chacun pour les mettre en cache.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/flavia.png',
  '/splash-bg.webp',
  '/parchment-tile.webp',
  '/card-parchment.webp',
  '/green-crackle-bg.webp',
  '/hero-home.webp',
  '/landing-bg.webp',
  '/avatar-1.webp',
  '/avatar-2.webp',
  '/avatar-3.webp',
  '/avatar-4.webp',
  '/avatar-5.webp',
  '/avatar-6.webp',
  '/icon-192.png',
  '/icon-512.png'
];

// Images/icônes/polices — ne changent quasiment jamais une fois livrées :
// on les sert instantanément depuis le cache au lieu de refaire un
// aller-retour réseau à chaque fois (c'était la cause du chargement lent
// des images, même en webp).
const STATIC_ASSET_RE = /\.(webp|png|jpe?g|svg|gif|woff2?|ttf)$/i;

// Images de scénarios hébergées sur Supabase Storage (bucket public
// aventures-images) — couvertures, étapes, badges, tampons. Comme les
// assets statiques ci-dessus, elles ne changent quasiment jamais une fois
// publiées : on veut les servir depuis le cache aussi, contrairement aux
// appels API/auth/realtime Supabase (données dynamiques, jamais mis en
// cache — voir plus bas).
const SUPABASE_STORAGE_RE = /\/storage\/v1\/object\/public\//;

// Installation — mettre en cache les fichiers essentiels. On ajoute
// chaque fichier individuellement (au lieu de cache.addAll, qui échoue en
// bloc si un seul fichier de la liste est introuvable) pour qu'un asset
// manquant ne casse pas le précache des autres.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// Activation — nettoyer les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  const isSupabase = url.hostname.endsWith('supabase.co');
  const isSupabaseImage = isSupabase && SUPABASE_STORAGE_RE.test(url.pathname);

  // Appels Supabase dynamiques (auth, rest, realtime) — jamais interceptés,
  // toujours en direct vers le réseau. Seules les images du bucket public
  // (aventures-images) passent par le cache ci-dessous.
  if (isSupabase && !isSupabaseImage) return;

  // Images/icônes/polices statiques + images de scénarios Supabase Storage
  // — cache-first avec mise à jour silencieuse en arrière-plan
  // (stale-while-revalidate) : affichage instantané depuis le cache, et la
  // copie est rafraîchie en tâche de fond si le fichier a changé.
  //
  // Les images Supabase sont chargées via <img src> sans attribut
  // crossorigin, donc la réponse récupérée ici est "opaque" (statut 0,
  // impossible à inspecter par sécurité cross-origin) même quand la
  // requête réussit — on l'accepte donc explicitement en plus du statut
  // 200 classique des assets same-origin, sinon elle ne serait jamais mise
  // en cache.
  if (STATIC_ASSET_RE.test(url.pathname) || isSupabaseImage) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cached => {
          const network = fetch(request).then(response => {
            if (response.status === 200 || response.type === 'opaque') {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          return cached || network;
        });
      })
    );
    return;
  }

  // App shell (HTML/JS) — stratégie Network First avec fallback cache,
  // inchangée, pour que les mises à jour de code arrivent bien.
  event.respondWith(
    fetch(request)
      .then(response => {
        // Mettre en cache les nouvelles ressources
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Si pas de réseau, utiliser le cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // Fallback pour les pages HTML
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
