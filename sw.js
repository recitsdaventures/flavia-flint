const CACHE_NAME = 'flavia-flint-v3';

// App shell — vérifié en réseau en priorité pour récupérer le code à jour,
// avec repli sur le cache hors-ligne.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/flavia.png'
];

// Images/icônes/polices — ne changent quasiment jamais une fois livrées :
// on les sert instantanément depuis le cache au lieu de refaire un
// aller-retour réseau à chaque fois (c'était la cause du chargement lent
// des images, même en webp).
const STATIC_ASSET_RE = /\.(webp|png|jpe?g|svg|gif|woff2?|ttf)$/i;

// Installation — mettre en cache les fichiers essentiels
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
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

  // Ne pas intercepter les requêtes Supabase
  if (request.url.includes('supabase.co')) return;

  const url = new URL(request.url);

  // Images/icônes/polices — cache-first avec mise à jour silencieuse en
  // arrière-plan (stale-while-revalidate) : affichage instantané depuis le
  // cache, et la copie est rafraîchie en tâche de fond si le fichier a changé.
  if (STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(request).then(cached => {
          const network = fetch(request).then(response => {
            if (response.status === 200) cache.put(request, response.clone());
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
