/* =====================================================================
   SERVICE WORKER — deixa o app abrir sem internet
   ---------------------------------------------------------------------
   - Arquivos do app (index, css, js, ícones): busca na internet primeiro
     (para pegar a versão nova) e, se não tiver internet ou demorar, usa a
     cópia guardada no celular.
   - Firebase (gstatic.com) e fontes: usa a cópia guardada; a versão está no
     endereço, então não muda.
   - O banco (Firestore) e o login NÃO passam por aqui: o app guarda os
     relatórios no próprio aparelho e envia quando a internet voltar.
   Ao mudar a lista de arquivos, aumente CACHE.
   ===================================================================== */
const CACHE = "rq-app-v7b";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./data.js",
  "./corretor.js",
  "./app.js",
  "./cloud.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const FIREBASE = ["firebase-app.js", "firebase-auth.js", "firebase-firestore.js"]
  .map(name => "https://www.gstatic.com/firebasejs/10.12.2/" + name);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // um arquivo que falhar não impede os outros
    await Promise.all(SHELL.concat(FIREBASE).map(url =>
      cache.add(new Request(url, { cache: "reload" })).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("rq-app-") && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

const STATIC_HOSTS = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];

/* Internet primeiro, com limite de tempo; sem resposta, usa a cópia guardada. */
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("demorou")), 6000))
    ]);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const saved = await cache.match(request, { ignoreSearch: true })
      || (request.mode === "navigate" ? await cache.match("./index.html") : null);
    if (saved) return saved;
    throw error;
  }
}

/* Cópia guardada primeiro (arquivos com versão no endereço). */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (STATIC_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
  }
  // o resto (Firestore, login) segue direto para a internet
});
