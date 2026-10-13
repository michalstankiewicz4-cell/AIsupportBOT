/*
 * Skrypt osadzający asystenta "ai".
 * Wklej na dowolnej stronie (np. przed </body>):
 *   <script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/ai/embed.js" defer></script>
 * Atrybuty opcjonalne: data-title, data-accent="#2e2787", data-position="left", data-open="true", data-endpoint="https://<worker>.workers.dev", data-turnstile="<site key>"
 */
(function () {
  var script = document.currentScript;
  var core = new URL('../shared/js/embed-core.js', script.src).href;
  import(core)
    .then(function (m) { return m.start('ai', script); })
    .catch(function (err) { console.error('[LTChat:ai] failed to load', err); });
})();
