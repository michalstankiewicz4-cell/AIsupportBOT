// Adres serwera panelu sterowania (Cloudflare Worker z panel/server/, patrz docs/PANEL.md).
// Puste = widżet działa na ustawieniach domyślnych (tryb: bot, rejestracja wyłączona).
// Można nadpisać na stronie: <script src=".../embed.js" data-panel="https://lekarze-panel....workers.dev">
export const PANEL_CONFIG = {
  endpoint: '',
};
