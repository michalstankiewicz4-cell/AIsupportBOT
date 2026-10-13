// Configuration of the "ai" assistant (browser side).
// endpoint:         URL of the deployed Cloudflare Worker (see docs/AI-SERWER.md).
//                   Leave empty to run in offline mode — the rule-based bot answers instead.
// turnstileSiteKey: public Cloudflare Turnstile site key (anti-bot). Empty = Turnstile off.
// Both can be overridden per page:
//   <script src=".../ai/embed.js" data-endpoint="https://..." data-turnstile="0x4AAA..."></script>
export const AI_CONFIG = {
  endpoint: '',
  turnstileSiteKey: '',
  timeoutMs: 20000,
};
