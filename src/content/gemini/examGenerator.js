const modelNames = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']
const maxRetriesPerModel = 1

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function getApiKey() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key is not configured')
  }
  return apiKey
}

function parseQuestions(text) {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
  const parsed = JSON.parse(cleaned)
  const questions = Array.isArray(parsed) ? parsed : parsed.questions
  const letters = ['A', 'B', 'C', 'D']

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Gemini returned no questions')
  }

  return questions.map((item, index) => {
    const choices = item.choices || {}
    const correctAnswer = String(item.correctAnswer || '').trim().toUpperCase()
    const question = String(item.question || '').trim()

    if (!question || letters.some((letter) => !String(choices[letter] || '').trim())) {
      throw new Error(`Gemini returned an invalid question at position ${index + 1}`)
    }
    if (!letters.includes(correctAnswer)) {
      throw new Error(`Gemini returned an invalid answer at position ${index + 1}`)
    }

    return {
      id: `temporary-${index + 1}`,
      question,
      letterA: String(choices.A).trim(),
      letterB: String(choices.B).trim(),
      letterC: String(choices.C).trim(),
      letterD: String(choices.D).trim(),
      correctAnswer,
      notes: String(item.explanation || '').trim(),
      orderIndex: index,
      questionNumber: index + 1,
    }
  })
}

export async function generateExamFromTitle(title, description, questionCount) {
  const prompt = `Create ${questionCount} high-quality multiple-choice exam questions about "${title}".
${description ? `Additional focus: ${description}` : ''}

Return only JSON in this exact shape:
[
  {
    "question": "...",
    "choices": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correctAnswer": "A",
    "explanation": "..."
  }
]

Use exactly four plausible choices and one unambiguous correct answer per question. Do not include markdown.`

  try {
    let lastError = 'Gemini request failed'

    for (const modelName of modelNames) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`

      for (let attempt = 0; attempt <= maxRetriesPerModel; attempt += 1) {
        const response = await fetch(`${apiUrl}?key=${encodeURIComponent(getApiKey())}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
            },
          }),
        })

        const data = await response.json()
        const shouldRetry = [429, 500, 502, 503, 504].includes(response.status)

        if (response.ok) {
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text
          if (!text) throw new Error('Gemini returned an empty response')
          return parseQuestions(text)
        }

        lastError = data.error?.message || lastError
        if (!shouldRetry) throw new Error(lastError)
        if (attempt < maxRetriesPerModel) {
          await wait(1000 * 2 ** attempt)
        }
      }
    }

    throw new Error(lastError)
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error('Gemini returned an invalid response. Please try again.')
    }
    throw new Error(err instanceof Error ? err.message : 'Failed to generate exam')
  }
}
