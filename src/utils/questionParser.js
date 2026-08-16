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

    const qaPairs = []
    // Some PDFs put a copy of the answer text after the letter (for example,
    // "Answer: A. The correct choice") before Notes. Accept either layout.
    const qaRegex = /(?:^|\n)\s*Answer\s*:\s*([A-D])(?:\.\s*[\s\S]*?)?\s*\n\s*Notes?\s*:\s*([\s\S]*?)(?=(?:\n\s*Answer\s*:|\n\s*\d{1,3}\.\s|<PARSED TEXT FOR PAGE:|$))/gi
    let qaMatch = qaRegex.exec(normalizedText)
    while (qaMatch) {
      qaPairs.push({
        answer: qaMatch[1].toUpperCase(),
        notes: qaMatch[2].replace(/\s+/g, ' ').trim(),
      })
      qaMatch = qaRegex.exec(normalizedText)
    }

    // Question numbers are printed at the beginning of a PDF line. Restricting
    // matches to line starts avoids splitting on numbers used in the question
    // text or answer choices (for example, "range of 40.").
    const questionRegex = /(?:^|\n)\s*(\d{1,3})\.\s*([\s\S]*?)(?=(?:\n\s*\d{1,3}\.\s|\n\s*Answer\s*:|$))/g
    let questionMatch = questionRegex.exec(normalizedText)

    const getOption = (letter, block) => {
      const pattern = new RegExp(`(?:^|\\n)\\s*${letter}\\.\\s*([\\s\\S]*?)(?=(?:\\n\\s*[A-D]\\.\\s|$))`, 'i')
      const match = block.match(pattern)
      return match ? match[1].replace(/\s+/g, ' ').trim() : ''
    }

    while (questionMatch) {
      const parsedNumber = Number.parseInt(questionMatch[1], 10)
      const block = questionMatch[2].trim()

      // Remove trailing answer or notes text if OCR merged sections.
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

      const mappedQA = qaPairs[questions.length]
      question.correctAnswer = mappedQA?.answer || 'A'
      question.notes = mappedQA?.notes || ''

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
