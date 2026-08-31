import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * Parse text content from PDF file
 */
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument(arrayBuffer).promise
  let text = ''

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    // Keep PDF line breaks. Besides producing cleaner questions, this prevents
    // values such as "40." or "0.51" within a sentence from being treated as a
    // new numbered question by the text parser.
    text += textContent.items
      .map((item) => `${item.str}${item.hasEOL ? '\n' : ' '}`)
      .join('')
      .trim() + '\n'
  }

  return text
}

/**
 * Parse questions from text format
 */
export function parseQuestionsFromText(text) {
  console.log('📄 Raw text input:', text)

  try {
    const cleanedText = String(text ?? '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim()

    const normalizedText = cleanedText
      .replace(/<PARSED TEXT FOR PAGE:[\s\S]*?>/gi, '\n')
      // PDFs repeat an all-caps header on every page. Match its stable three-part
      // structure (title | subject | questions n-n) rather than a particular
      // course code or test label, while leaving ordinary all-caps content alone.
      .replace(/\b[A-Z][A-Z0-9 _-]*?\|\s*[A-Z0-9 ,&'’()_-]+\|\s*QUESTIONS\s+\d+\s*[-–]\s*\d+/g, '\n')
      .replace(/\bPage\s+\d+\b/gi, '\n')

    const questions = []

    // Question numbers are printed at the beginning of a PDF line. Keep the
    // answer and optional notes in the same block as their question, so PDFs
    // with no Notes section use exactly the same parsing path as PDFs with one.
    // Restricting matches to line starts avoids splitting on values such as
    // "range of 40." in question text or answer choices.
    const questionRegex = /(?:^|\n)\s*(\d{1,3})\.\s*([\s\S]*?)(?=(?:\n\s*\d{1,3}\.\s|$))/g
    let questionMatch = questionRegex.exec(normalizedText)

    const getOption = (letter, block) => {
      const pattern = new RegExp(`(?:^|\\n)\\s*${letter}\\.\\s*([\\s\\S]*?)(?=(?:\\n\\s*[A-D]\\.\\s|$))`, 'i')
      const match = block.match(pattern)
      return match ? match[1].replace(/\s+/g, ' ').trim() : ''
    }

    while (questionMatch) {
      const parsedNumber = Number.parseInt(questionMatch[1], 10)
      const block = questionMatch[2].trim()

      const answerMatch = block.match(/(?:^|\n)\s*Answer\s*:\s*([A-D])\b/i)
      const notesMatch = block.match(/(?:^|\n)\s*Notes?\s*:\s*([\s\S]*?)\s*$/i)

      // Remove trailing answer and notes text before parsing the question and
      // choices. Notes are optional, so their absence never rejects a question.
      const safeBlock = block.split(/\bAnswer\s*:/i)[0].trim()

      const questionTextMatch = safeBlock.match(/^([\s\S]*?)(?=\n\s*A\.\s|$)/i)
      const questionText = questionTextMatch ? questionTextMatch[1].replace(/\s+/g, ' ').trim() : ''

      const question = {
        orderIndex: questions.length,
        questionNumber: Number.isNaN(parsedNumber) ? questions.length + 1 : parsedNumber,
        question: questionText,
        letterA: getOption('A', safeBlock),
        letterB: getOption('B', safeBlock),
        letterC: getOption('C', safeBlock),
        letterD: getOption('D', safeBlock),
      }

      question.correctAnswer = answerMatch?.[1]?.toUpperCase() || 'A'
      question.notes = notesMatch?.[1]?.replace(/\s+/g, ' ').trim() || ''

      console.log(`\n🔍 Processing block for #${question.questionNumber}: "${safeBlock.substring(0, 120)}..."`)
      console.log(`✅ Question: "${question.question}"`)
      console.log(`✅ Options: A="${question.letterA}", B="${question.letterB}", C="${question.letterC}", D="${question.letterD}"`)
      console.log(`✅ Answer: ${question.correctAnswer}`)
      if (question.notes) {
        console.log(`✅ Notes: "${question.notes}"`)
      }

      if (question.question && question.letterA && question.letterB && question.letterC && question.letterD) {
        questions.push(question)
        console.log('💾 Saved question')
      } else {
        console.log('❌ Incomplete question, skipping')
      }

      questionMatch = questionRegex.exec(normalizedText)
    }

    console.log(`\n📊 Total questions parsed: ${questions.length}`)
    console.log('🎯 Final questions:', questions)

    return questions
  } catch (error) {
    console.error('Question parsing failed:', error)
    return []
  }
}

/**
 * Validate that a question has all required fields
 */
function isValidQuestion(q) {
  return (
    q?.question?.trim() &&
    q?.letterA?.trim() &&
    q?.letterB?.trim() &&
    q?.letterC?.trim() &&
    q?.letterD?.trim() &&
    ['A', 'B', 'C', 'D'].includes(q?.correctAnswer)
  )
}
