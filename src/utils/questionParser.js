import * as pdfjsLib from 'pdfjs-dist'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

/**
 * Parse text content from PDF file
 */
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
  let text = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    text += textContent.items.map((item) => item.str).join(' ') + '\n'
  }

  return text
}

/**
 * Parse questions from text format
 * Expected format:
 * 1. Question text here?
 * A. Option A
 * B. Option B
 * C. Option C
 * D. Option D
 * Answer: B
 *
 * 2. Next question?
 * ...
 */
export function parseQuestionsFromText(text) {
  const questions = []
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)

  let currentQuestion = null
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Check if this line starts a new question (e.g., "1. Question text")
    const questionMatch = line.match(/^(\d+)\.\s+(.+)/)
    if (questionMatch) {
      // Save previous question if exists
      if (currentQuestion && isValidQuestion(currentQuestion)) {
        questions.push(currentQuestion)
      }

      // Start new question
      currentQuestion = {
        question: questionMatch[2],
        letterA: '',
        letterB: '',
        letterC: '',
        letterD: '',
        correctAnswer: 'A',
      }
      i++
      continue
    }

    // Check for answer options (A., B., C., D.)
    if (currentQuestion) {
      const optionMatch = line.match(/^([A-D])\.\s+(.+)/)
      if (optionMatch) {
        const letter = optionMatch[1].toLowerCase()
        const option = optionMatch[2]
        currentQuestion[`letter${letter.toUpperCase()}`] = option
        i++
        continue
      }

      // Check for answer indicator (Answer: B)
      const answerMatch = line.match(/^Answer\s*:\s*([A-D])/i)
      if (answerMatch) {
        currentQuestion.correctAnswer = answerMatch[1].toUpperCase()
        i++
        continue
      }
    }

    i++
  }

  // Don't forget the last question
  if (currentQuestion && isValidQuestion(currentQuestion)) {
    questions.push(currentQuestion)
  }

  return questions
}

/**
 * Validate that a question has all required fields
 */
function isValidQuestion(q) {
  return (
    q.question?.trim() &&
    q.letterA?.trim() &&
    q.letterB?.trim() &&
    q.letterC?.trim() &&
    q.letterD?.trim() &&
    ['A', 'B', 'C', 'D'].includes(q.correctAnswer)
  )
}
