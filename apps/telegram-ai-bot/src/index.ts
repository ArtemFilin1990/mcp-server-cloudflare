import { handleTelegramUpdate } from './telegram'
import type { Env } from './types'

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url)

		if (request.method === 'GET' && url.pathname === '/') {
			return new Response('Telegram AI bot is running.\n', {
				headers: { 'content-type': 'text/plain; charset=utf-8' },
			})
		}

		if (request.method === 'POST' && url.pathname === '/telegram/webhook') {
			const expected = env.TELEGRAM_WEBHOOK_SECRET
			const received = request.headers.get('x-telegram-bot-api-secret-token')
			if (!expected || received !== expected) {
				return new Response('unauthorized', { status: 401 })
			}

			let update: unknown
			try {
				update = await request.json()
			} catch {
				return new Response('bad request', { status: 400 })
			}

			ctx.waitUntil(handleTelegramUpdate(update, env).catch((err) => console.error('update failed', err)))
			return new Response('ok')
		}

		return new Response('not found', { status: 404 })
	},
} satisfies ExportedHandler<Env>
