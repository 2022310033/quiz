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

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    text += textContent.items.map((item) => item.str).join(' ') + '\n'
  }

  return text
}

/**
 * Parse questions from text format
 */
export function parseQuestionsFromText(text) {
  console.log('📄 Raw text input:', text)
  
  const questions = []
  
  // Split by question numbers (1., 2., 3., etc)
  // This handles both newline-separated and space-separated content
  const questionBlocks = text.split(/(?=\d+\.)/).filter(Boolean)
  
  console.log(`📦 Found ${questionBlocks.length} question blocks`)
  console.log('📦 Question blocks:', questionBlocks)

  for (const block of questionBlocks) {
    console.log(`\n🔍 Processing block: "${block.substring(0, 100)}..."`)
    
    const question = {}
    
    // Extract question number and text
    const qMatch = block.match(/^(\d+)\.\s*(.+?)(?=\s*[A-D]\.)/s)
    if (!qMatch) {
      console.log(`⚠️ Could not extract question`)
      continue
    }
    question.question = qMatch[2].trim()
    console.log(`✅ Question: "${question.question}"`)

    // Extract options A, B, C, D
    const aMatch = block.match(/A\.\s*(.+?)(?=\s*B\.)/s)
    const bMatch = block.match(/B\.\s*(.+?)(?=\s*C\.)/s)
    const cMatch = block.match(/C\.\s*(.+?)(?=\s*D\.)/s)
    const dMatch = block.match(/D\.\s*(.+?)(?=\s*Answer|$)/s)

    question.letterA = aMatch ? aMatch[1].trim() : ''
    question.letterB = bMatch ? bMatch[1].trim() : ''
    question.letterC = cMatch ? cMatch[1].trim() : ''
    question.letterD = dMatch ? dMatch[1].trim() : ''

    console.log(`✅ Options: A="${question.letterA}", B="${question.letterB}", C="${question.letterC}", D="${question.letterD}"`)

    // Extract answer
    const answerMatch = block.match(/Answer\s*:\s*([A-D])/i)
    question.correctAnswer = answerMatch ? answerMatch[1].toUpperCase() : 'A'
    console.log(`✅ Answer: ${question.correctAnswer}`)

    // Validate and add
    if (question.question && question.letterA && question.letterB && question.letterC && question.letterD) {
      questions.push(question)
      console.log(`💾 Saved question`)
    } else {
      console.log(`❌ Incomplete question, skipping`)
    }
  }

  console.log(`\n📊 Total questions parsed: ${questions.length}`)
  console.log('🎯 Final questions:', questions)

  return questions
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
