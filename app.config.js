// Estende o app.json. No GitHub Pages o site fica em /AgendaFamiliar: o workflow
// define EXPO_BASE_URL; localmente fica vazio e o app roda na raiz.
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || "" },
});
