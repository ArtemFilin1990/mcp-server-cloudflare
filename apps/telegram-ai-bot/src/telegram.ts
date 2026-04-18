import { generateReply } from './ai'
import { clearHistory, loadHistory, saveHistory } from './history'
import type { Env, TelegramMessage, TelegramUpdate } from './types'

const HELP_TEXT =
	'I am an AI assistant running on Cloudflare Workers.\n\n' +
	'Commands:\n' +
	'/start — greet and reset the conversation\n' +
	'/reset — clear conversation history\n' +
	'/model — show the model in use\n' +
	'/help — show this message\n\n' +
	Just send a message and I will reply.'

export async function handleTelegramUpdate(rawUpdate: unknown, env: Env): Promise<void> {
	const update = rawUpdate as TelegramUpdate
	const message = update.message ?? update.edited_message
	if (!message || !message.text) return

	const text = message.text.trim()
	if (text.startsWith('/')) {
		await handleCommand(message, text, env)
		return
	}

	await handleChat(message, text, env)
}

async function handleCommand(message: TelegramMessage, text: string, env: Env): Promise<void> {
	const command = text.split(/\s+/, 1)[0].split('@')[0].toLowerCase()
	const chatId = message.chat.id

	switch (command) {
		case '/start':
			await clearHistory(env, chatId)
			await sendMessage(
				env,
				chatId,
				`Hi${message.from?.first_name ? `, ${message.from.first_name}` : ''}! ${HELP_TEXT}`,
				message.message_id,
			)
			return
		case '/help':
			await sendMessage(env, chatId, HELP_TEXT, message.message_id)
			return
		case '/reset':
			await clearHistory(env, chatId)
			await sendMessage(env, chatId, 'Conversation history cleared.', message.message_id)
			return
		case '/model':
			await sendMessage(env, chatId, `Current model: ${env.AI_MODEL}`, message.message_id)
			return
		default:
			await sendMessage(env, chatId, `Unknown command: ${command}`, message.message_id)
	}
}

async function handleChat(message: TelegramMessage, text: string, env: Env): Promise<void> {
	const chatId = message.chat.id
	await sendChatAction(env, chatId, 'typing')

	const history = await loadHistory(env, chatId)
	history.push({ role: 'user', content: text })

	let reply: string
	try {
		reply = await generateReply(env, history)
	} catch (err) {
		console.error('AI generation failed', err)
		await sendMessage(env, chatId, 'Sorry, I could not generate a reply. Please try again.', message.message_id)
		return
	}

	history.push({ role: 'assistant', content: reply })
	await saveHistory(env, chatId, history)
	await sendMessage(env, chatId, reply, message.message_id)
}

async function sendMessage(env: Env, chatId: number, text: string, replyTo?: number): Promise<void> {
	const chunks = chunkText(text, 4000)
	for (let i = 0; i < chunks.length; i++) {
		await callTelegram(env, 'sendMessage', {
			chat_id: chatId,
			text: chunks[i],
			reply_to_message_id: i === 0 ? replyTo : undefined,
			allow_sending_without_reply: true,
		})
	}
}

async function sendChatAction(env: Env, chatId: number, action: string): Promise<void> {
	try {
		await callTelegram(env, 'sendChatAction', { chat_id: chatId, action })
	} catch (err) {
		console.warn('sendChatAction failed', err)
	}
}

async function callTelegram(env: Env, method: string, body: Record<string, unknown>): Promise<void> {
	const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	})
	if (!res.ok) {
		const detail = await res.text().catch(() => '')
		throw new Error(`Telegram ${method} failed: ${res.status} ${detail}`)
	}
}

function chunkText(text: string, size: number): string[] {
	if (text.length <= size) return [text]
	const chunks: string[] = []
	let remaining = text
	while (remaining.length > size) {
		let splitAt = remaining.lastIndexOf('\n', size)
		if (splitAt < size / 2) splitAt = size
		chunks.push(remaining.slice(0, splitAt))
		remaining = remaining.slice(splitAt).replace(/^\n/, '')
	}
	if (remaining.length) chunks.push(remaining)
	return chunks
}
