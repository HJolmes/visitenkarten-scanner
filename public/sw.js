// Service Worker der Web-App. Hält App und Texterkennung im Zwischenspeicher, damit der
// Start schnell geht und die Erkennung ohne Netz läuft. Seite selbst: erst Netz, dann Speicher.
const SPEICHER = 'visitenkarte-v2';
// Wurzel der App, z. B. https://hjolmes.github.io/visitenkarten-scanner/
const BASIS = self.registration.scope;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SPEICHER).then((c) => c.addAll([BASIS, BASIS + 'manifest.webmanifest'])));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((namen) => Promise.all(namen.filter((n) => n !== SPEICHER).map((n) => caches.delete(n)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const anfrage = e.request;
  if (anfrage.method !== 'GET') return;
  const url = new URL(anfrage.url);

  if (anfrage.mode === 'navigate') {
    e.respondWith(
      fetch(anfrage)
        .then((antwort) => {
          const kopie = antwort.clone();
          caches.open(SPEICHER).then((c) => c.put(BASIS, kopie));
          return antwort;
        })
        .catch(() => caches.match(BASIS)),
    );
    return;
  }

  // Gebündelte App-Dateien (Name enthält Prüfsumme), OCR- und QR-Dateien, Icons:
  // ändern sich nur mit neuer Version, also erst Speicher, dann Netz
  const unveraenderlich =
    url.href.startsWith(BASIS) && /^(_expo|tesseract|zxing|icons)\//.test(url.href.slice(BASIS.length));
  if (!unveraenderlich) return;

  e.respondWith(
    caches.match(anfrage).then(
      (treffer) =>
        treffer ||
        fetch(anfrage).then((antwort) => {
          if (antwort.ok) {
            const kopie = antwort.clone();
            caches.open(SPEICHER).then((c) => c.put(anfrage, kopie));
          }
          return antwort;
        }),
    ),
  );
});
