const fs = require("node:fs");
// Estende o app.json.
// - GitHub Pages: o site fica em /AgendaFamiliar; o workflow define EXPO_BASE_URL.
// - Android/FCM: google-services.json não vai para o git; no EAS vem da variável
//   de arquivo GOOGLE_SERVICES_JSON, localmente do arquivo na raiz (se existir).
module.exports = ({ config }) => {
  const googleServicesFile =
    process.env.GOOGLE_SERVICES_JSON ||
    (fs.existsSync("./google-services.json") ? "./google-services.json" : undefined);
  return {
    ...config,
    experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || "" },
    android: { ...config.android, ...(googleServicesFile ? { googleServicesFile } : {}) },
  };
};
