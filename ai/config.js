// Konfiguracja asystenta "ai" (strona przeglądarki).
// endpoint:         adres wdrożonego Cloudflare Workera (patrz docs/AI-SERWER.md).
//                   Puste = tryb offline — zamiast AI odpowiada bot regułowy.
// turnstileSiteKey: publiczny Site Key Cloudflare Turnstile (ochrona przed botami). Puste = Turnstile wyłączony.
// Oba można nadpisać na konkretnej stronie:
//   <script src=".../ai/embed.js" data-endpoint="https://..." data-turnstile="0x4AAA..."></script>
export const AI_CONFIG = {
  endpoint: '',
  turnstileSiteKey: '',
  timeoutMs: 20000,
};
