import type { ChatTurn, Env } from './types'

const HISTORY_TTL_SECONDS = 60 * 60 * 24 * 7

function key(chatId: number): string {
	return `chat:${chatId}:history`
}

function maxTurns(env: Env): number {
	const parsed = Number.parseInt(env.HISTORY_TURNS ?? '', 10)
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 8
}

export async function loadHistory(env: Env, chatId: number): Promise<ChatTurn[]> {
	const raw = await env.CHAT_KV.get(key(chatId), 'json')
	if (!Array.isArray(raw)) return []
	return raw.filter(
		(t): t is ChatTurn =>
			!!t &&
			typeof t === 'object' &&
			typeof (t as ChatTurn).role === 'string' &&
			typeof (t as ChatTurn).content === 'string',
	)
}

export async function saveHistory(env: Env, chatId: number, history: ChatTurn[]): Promise<void> {
	const trimmed = trim(history, maxTurns(env))
	await env.CHAT_KV.put(key(chatId), JSON.stringify(trimmed), { expirationTtl: HISTORY_TTL_SECONDS })
}

export async function clearHistory(env: Env, chatId: number): Promise<void> {
	await env.CHAT_KV.delete(key(chatId))
}

function trim(history: ChatTurn[], turns: number): ChatTurn[] {
	const maxMessages = turns * 2
	if (history.length <= maxMessages) return history
	return history.slice(history.length - maxMessages)
}
