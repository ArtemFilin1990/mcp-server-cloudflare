export interface Env {
	AI: Ai
	CHAT_KV: KVNamespace
	TELEGRAM_BOT_TOKEN: string
	TELEGRAM_WEBHOOK_SECRET: string
	AI_MODEL: string
	SYSTEM_PROMPT: string
	HISTORY_TURNS: string
}

export interface TelegramUser {
	id: number
	is_bot?: boolean
	first_name?: string
	username?: string
	language_code?: string
}

export interface TelegramChat {
	id: number
	type: 'private' | 'group' | 'supergroup' | 'channel'
	title?: string
}

export interface TelegramMessage {
	message_id: number
	from?: TelegramUser
	chat: TelegramChat
	date: number
	text?: string
}

export interface TelegramUpdate {
	update_id: number
	message?: TelegramMessage
	edited_message?: TelegramMessage
}

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatTurn {
	role: ChatRole
	content: string
}
