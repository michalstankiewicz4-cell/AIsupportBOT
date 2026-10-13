// Configuration of the "ai" assistant (browser side).
// endpoint: URL of the deployed Cloudflare Worker (see docs/AI-SERWER.md).
// Leave empty to run in offline mode — the rule-based bot answers instead.
// Can be overridden per page: <script src=".../ai/embed.js" data-endpoint="https://...">
export const AI_CONFIG = {
  endpoint: '',
  timeoutMs: 20000,
};
