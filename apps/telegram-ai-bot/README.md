# Telegram AI Bot (Cloudflare Worker)

A minimal Telegram bot running entirely on Cloudflare Workers. It uses
[Workers AI](https://developers.cloudflare.com/workers-ai/) to generate
replies and stores a short per-chat history in KV so the conversation
feels continuous.

## Features

- Telegram webhook endpoint (`POST /telegram/webhook`)
- Verifies Telegram's `X-Telegram-Bot-Api-Secret-Token` header
- Generates replies with Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast` by default)
- Keeps the last N turns of history per chat in KV
- Commands: `/start`, `/help`, `/reset`, `/model`

## Setup

1. Create a Telegram bot via [@BotFather](https://t.me/BotFather) and grab the token.
2. Create a Cloudflare KV namespace for chat history and put its id in
   `wrangler.jsonc`:

   ```sh
   wrangler kv namespace create CHAT_KV
   ```

3. Store the Telegram token and a webhook secret as Worker secrets:

   ```sh
   wrangler secret put TELEGRAM_BOT_TOKEN
   wrangler secret put TELEGRAM_WEBHOOK_SECRET
   ```

4. Deploy:

   ```sh
   pnpm --filter cloudflare-telegram-ai-bot deploy
   ```

5. Register the webhook with Telegram (replace the URL and secret):

   ```sh
   curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
     -d url="https://<your-worker>.workers.dev/telegram/webhook" \
     -d secret_token="$TELEGRAM_WEBHOOK_SECRET"
   ```

## Local dev

```sh
pnpm --filter cloudflare-telegram-ai-bot dev
```

For local webhooks, expose the dev server with `cloudflared tunnel` or
similar and point `setWebhook` at the tunnel URL.

## Configuration

| Variable | Kind | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | secret | BotFather token |
| `TELEGRAM_WEBHOOK_SECRET` | secret | Shared secret verified on every webhook |
| `AI_MODEL` | var | Workers AI model id (default `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) |
| `SYSTEM_PROMPT` | var | System prompt used for every conversation |
| `HISTORY_TURNS` | var | Max number of user/assistant turns kept per chat |
| `AI` | binding | Workers AI |
| `CHAT_KV` | binding | KV namespace for chat history |
