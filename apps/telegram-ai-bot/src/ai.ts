import type { ChatTurn, Env } from './types'

export async function generateReply(env: Env, history: ChatTurn[]): Promise<string> {
	const messages: ChatTurn[] = [
		{ role: 'system', content: env.SYSTEM_PROMPT },
		...history,
	]

	const model = env.AI_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
	const result = (await env.AI.run(model as never, { messages, max_tokens: 1024 } as never)) as unknown

	const text = extractText(result)
	if (!text) throw new Error('empty AI response')
	return text.trim()
}

function extractText(result: unknown): string {
	if (!result) return ''
	if (typeof result === 'string') return result
	if (typeof result === 'object') {
		const r = result as Record<string, unknown>
		if (typeof r.response === 'string') return r.response
		if (typeof r.output_text === 'string') return r.output_text
		if (Array.isArray(r.choices) && r.choices.length) {
			const choice = r.choices[0] as Record<string, unknown> | undefined
			const msg = choice?.message as Record<string, unknown> | undefined
			if (msg && typeof msg.content === 'string') return msg.content
		}
	}
	return ''
}
