/*
 * Embed script for the "bot" assistant.
 * Paste on any page (e.g. before </body>):
 *   <script src="https://michalstankiewicz4-cell.github.io/AIsupportBOT/bot/embed.js" defer></script>
 * Optional attributes: data-title, data-accent="#0e7c86", data-position="left", data-open="true"
 */
(function () {
  var script = document.currentScript;
  var core = new URL('../shared/js/embed-core.js', script.src).href;
  import(core)
    .then(function (m) { return m.start('bot', script); })
    .catch(function (err) { console.error('[LTChat:bot] failed to load', err); });
})();
