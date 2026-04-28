// Ranketes Service Worker
// Cache básico pra funcionar offline (parcialmente)

const CACHE_NAME = 'ranketes-v1';
const STATIC_ASSETS = [
  'logo.PNG',
  'icon-192.png',
  'icon-512.png',
  'supabase.js',
];

// Instalação: cacheia recursos estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Cache miss:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: 
// - HTML/JS/CSS: tenta rede primeiro, fallback cache
// - Imagens: cache primeiro, fallback rede
// - APIs Supabase: SEMPRE rede (sem cache)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Não cacheia APIs (Supabase, etc)
  if (url.host.includes('supabase') || url.host.includes('api.')) {
    return; // deixa o fetch padrão acontecer
  }
  
  // Apenas GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Salva no cache pra uso offline
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // Se rede falhar, tenta cache
        return caches.match(event.request);
      })
  );
});
