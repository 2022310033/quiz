import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

/**
 * Get all question sets
 */
export async function getAllSets() {
  try {
    const snapshot = await getDocs(collection(db, 'questionSets'))
    let sets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    
    // Sort by createdAt (newest first)
    sets = sets.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0
      const timeB = b.createdAt?.toMillis?.() || 0
      return timeB - timeA
    })
    
    return sets
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch sets')
  }
}

/**
 * Create a new question set
 */
export async function createSet(name, description = '') {
  try {
    const docRef = await addDoc(collection(db, 'questionSets'), {
      name,
      description,
      questionCount: 0,
      createdAt: serverTimestamp(),
    })
    return { id: docRef.id, name, description, questionCount: 0 }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to create set')
  }
}

/**
 * Update a question set
 */
export async function updateSet(setId, name, description) {
  try {
    const ref = doc(db, 'questionSets', setId)
    await updateDoc(ref, {
      name,
      description,
    })
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to update set')
  }
}

/**
 * Delete a question set and all its questions
 */
export async function deleteSet(setId) {
  try {
    // Delete all questions in this set
    const questionsSnapshot = await getDocs(
      query(collection(db, 'questions'), where('setId', '==', setId))
    )
    
    for (const docSnap of questionsSnapshot.docs) {
      await deleteDoc(doc(db, 'questions', docSnap.id))
    }
    
    // Delete the set itself
    const ref = doc(db, 'questionSets', setId)
    await deleteDoc(ref)
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to delete set')
  }
}

/**
 * Get all questions for a specific set
 */
export async function getQuestionsBySet(setId) {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'questions'), where('setId', '==', setId))
    )
    
    let questions = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    
    // Sort by createdAt (newest first)
    questions = questions.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0
      const timeB = b.createdAt?.toMillis?.() || 0
      return timeB - timeA
    })
    
    return questions
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch questions')
  }
}

/**
 * Add a question to a set
 */
export async function addQuestionToSet(setId, questionData) {
  try {
    const docRef = await addDoc(collection(db, 'questions'), {
      setId,
      question: questionData.question,
      letterA: questionData.letterA,
      letterB: questionData.letterB,
      letterC: questionData.letterC,
      letterD: questionData.letterD,
      correctAnswer: questionData.correctAnswer,
      createdAt: serverTimestamp(),
    })
    
    // Update question count on the set
    await updateSetQuestionCount(setId)
    
    return docRef.id
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to add question')
  }
}

/**
 * Update a question
 */
export async function updateQuestion(questionId, questionData) {
  try {
    const ref = doc(db, 'questions', questionId)
    await updateDoc(ref, {
      question: questionData.question,
      letterA: questionData.letterA,
      letterB: questionData.letterB,
      letterC: questionData.letterC,
      letterD: questionData.letterD,
      correctAnswer: questionData.correctAnswer,
    })
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to update question')
  }
}

/**
 * Delete a question
 */
export async function deleteQuestion(questionId, setId) {
  try {
    const ref = doc(db, 'questions', questionId)
    await deleteDoc(ref)
    
    // Update question count on the set
    await updateSetQuestionCount(setId)
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to delete question')
  }
}

/**
 * Update the question count on a set
 */
export async function updateSetQuestionCount(setId) {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'questions'), where('setId', '==', setId))
    )
    
    const ref = doc(db, 'questionSets', setId)
    await updateDoc(ref, {
      questionCount: snapshot.size,
    })
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to update question count')
  }
}
