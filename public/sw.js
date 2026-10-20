// Service Worker der Web-App. Hält App und Texterkennung im Zwischenspeicher, damit der
// Start schnell geht und die Erkennung ohne Netz läuft. Seite selbst: erst Netz, dann Speicher.
const SPEICHER = 'visitenkarte-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SPEICHER).then((c) => c.addAll(['/', '/manifest.webmanifest'])));
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
          caches.open(SPEICHER).then((c) => c.put('/', kopie));
          return antwort;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Gebündelte App-Dateien (Name enthält Prüfsumme), OCR- und QR-Dateien, Icons:
  // ändern sich nur mit neuer Version, also erst Speicher, dann Netz
  const unveraenderlich =
    url.origin === self.location.origin && /^\/(_expo|tesseract|zxing|icons)\//.test(url.pathname);
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
