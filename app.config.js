// Ergänzt app.json. BASE_URL setzt den Unterpfad der Web-App, z. B. für GitHub Pages
// "/visitenkarten-scanner" (siehe .github/workflows/pages.yml). Lokal leer.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.BASE_URL ? { baseUrl: process.env.BASE_URL } : {}),
  },
});
