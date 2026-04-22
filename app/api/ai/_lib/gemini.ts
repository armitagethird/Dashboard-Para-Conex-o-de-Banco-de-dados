const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent'

export interface GeminiResult {
  text: string
  inputTokens: number
  outputTokens: number
}

interface GeminiResponsePart {
  text?: string
}

interface GeminiCandidate {
  content?: { parts?: GeminiResponsePart[] }
}

interface GeminiApiResponse {
  candidates?: GeminiCandidate[]
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function callGemini(
  systemInstruction: string,
  userPrompt: string,
  attempt = 1
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada nas variáveis de ambiente')
  }

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 2048,
      responseMimeType: 'text/plain',
    },
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  })

  if ((response.status === 503 || response.status === 429) && attempt <= 3) {
    await sleep(attempt * 8_000)
    return callGemini(systemInstruction, userPrompt, attempt + 1)
  }

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Gemini API retornou ${response.status}: ${errorBody.slice(0, 200)}`
    )
  }

  const data = (await response.json()) as GeminiApiResponse

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  if (!text.trim()) {
    throw new Error('Gemini retornou resposta vazia ou sem conteúdo')
  }

  const inputTokens = data?.usageMetadata?.promptTokenCount ?? 0
  const outputTokens = data?.usageMetadata?.candidatesTokenCount ?? 0

  return { text, inputTokens, outputTokens }
}
