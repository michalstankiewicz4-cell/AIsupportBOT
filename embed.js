/*
 * Uniwersalny skrypt asystenta — tryb pracy (bot / nasz model / AI / kombinacja)
 * wybierasz w panelu sterowania, bez zmian na stronie kliniki.
 * Wklej na stronie (np. przed </body>):
 *   <script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/embed.js"
 *           data-panel="https://lekarze-panel.TWOJE-KONTO.workers.dev"
 *           data-endpoint="https://lekarze-ai-assistant.TWOJE-KONTO.workers.dev" defer></script>
 * data-panel    — serwer panelu (bez niego: domyślnie bot regułowy)
 * data-endpoint — serwer AI (potrzebny tylko, gdy tryb w panelu używa AI)
 * Pozostałe atrybuty jak w bot/embed.js: data-title, data-accent, data-position, data-open, data-turnstile.
 */
(function () {
  var script = document.currentScript;
  var core = new URL('shared/js/embed-core.js', script.src).href;
  import(core)
    .then(function (m) { return m.start('auto', script); })
    .catch(function (err) { console.error('[LTChat] failed to load', err); });
})();
