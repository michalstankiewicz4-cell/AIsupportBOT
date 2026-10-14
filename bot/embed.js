/*
 * Skrypt osadzający asystenta "bot".
 * Wklej na dowolnej stronie (np. przed </body>):
 *   <script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/bot/embed.js" defer></script>
 * Atrybuty opcjonalne: data-title, data-accent="#2e2787", data-position="left", data-open="true", data-panel="<serwer panelu>"
 */
(function () {
  var script = document.currentScript;
  var core = new URL('../shared/js/embed-core.js', script.src).href;
  import(core)
    .then(function (m) { return m.start('bot', script); })
    .catch(function (err) { console.error('[LTChat:bot] failed to load', err); });
})();
