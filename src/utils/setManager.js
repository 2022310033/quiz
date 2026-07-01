import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'

let cachedFolders = null
let cachedSets = null
const cachedQuestionsBySet = new Map()

export function clearCache() {
  cachedFolders = null
  cachedSets = null
  cachedQuestionsBySet.clear()
}

/**
 * Get all folders
 */
export async function getAllFolders(forceRefresh = false) {
  if (cachedFolders && !forceRefresh) {
    return cachedFolders
  }

  try {
    const snapshot = await getDocs(query(collection(db, 'folders'), orderBy('name')))
    const folders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    cachedFolders = folders
    return folders
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch folders')
  }
}

/**
 * Create a new folder
 */
export async function createFolder(name, color = '#3b82f6') {
  try {
    const trimmedName = name.trim()
    const docRef = await addDoc(collection(db, 'folders'), {
      name: trimmedName,
      color,
      createdAt: serverTimestamp(),
    })

    cachedFolders = null
    return { id: docRef.id, name: trimmedName, color }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to create folder')
  }
}

/**
 * Get all question sets
 */
export async function getAllSets(forceRefresh = false) {
  if (cachedSets && !forceRefresh) {
    return cachedSets
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, 'questionSets'), orderBy('createdAt', 'desc'))
    )
    const sets = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    cachedSets = sets
    return sets
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch sets')
  }
}

/**
 * Create a new question set
 */
export async function createSet(name, description = '', options = {}) {
  try {
    const docRef = await addDoc(collection(db, 'questionSets'), {
      name,
      description,
      folderId: options.folderId || '',
      type: options.type || (name.endsWith(' - Retake') ? 'retake' : 'set'),
      sourceSetId: options.sourceSetId || null,
      questionCount: 0,
      createdAt: serverTimestamp(),
    })
    cachedSets = null
    return {
      id: docRef.id,
      name,
      description,
      folderId: options.folderId || '',
      type: options.type || (name.endsWith(' - Retake') ? 'retake' : 'set'),
      sourceSetId: options.sourceSetId || null,
      questionCount: 0,
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to create set')
  }
}

/**
 * Find a question set by exact name
 */
export async function getSetByName(name) {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'questionSets'), where('name', '==', name))
    )

    if (snapshot.empty) {
      return null
    }

    const docSnap = snapshot.docs[0]
    return { id: docSnap.id, ...docSnap.data() }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch set by name')
  }
}

/**
 * Find a retake set by its original set ID
 */
export async function getRetakeSetBySourceSetId(sourceSetId) {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'questionSets'), where('sourceSetId', '==', sourceSetId))
    )

    if (snapshot.empty) {
      return null
    }

    const docSnap =
      snapshot.docs.find((item) => item.data().type === 'retake') || snapshot.docs[0]

    return { id: docSnap.id, ...docSnap.data() }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch retake set')
  }
}

/**
 * Keep a retake set attached to its source set and folder
 */
export async function updateRetakeSetMetadata(setId, sourceSetId, folderId = '') {
  try {
    const ref = doc(db, 'questionSets', setId)
    await updateDoc(ref, {
      folderId,
      type: 'retake',
      sourceSetId,
    })
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to update retake set')
  }
}

/**
 * Find saved retake questions by original question ID
 */
export async function getQuestionsByOriginalQuestionId(setId, originalQuestionId) {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'questions'),
        where('setId', '==', setId),
        where('originalQuestionId', '==', originalQuestionId)
      )
    )

    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch question by original ID')
  }
}

/**
 * Update a question set
 */
export async function updateSet(setId, name, description, folderId = '') {
  try {
    const ref = doc(db, 'questionSets', setId)
    await updateDoc(ref, {
      name,
      description,
      folderId,
    })

    const retakeName = name.endsWith(' - Retake') ? name : `${name} - Retake`
    const [retakeBySourceSnapshot, retakeByNameSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'questionSets'), where('sourceSetId', '==', setId))),
      getDocs(query(collection(db, 'questionSets'), where('name', '==', retakeName))),
    ])

    const retakeDocs = new Map()
    for (const docSnap of [...retakeBySourceSnapshot.docs, ...retakeByNameSnapshot.docs]) {
      retakeDocs.set(docSnap.id, docSnap)
    }

    for (const docSnap of retakeDocs.values()) {
      await updateDoc(doc(db, 'questionSets', docSnap.id), {
        folderId,
        type: 'retake',
        sourceSetId: setId,
      })
    }

    cachedSets = null
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

    cachedSets = null
    cachedQuestionsBySet.delete(setId)
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to delete set')
  }
}

/**
 * Get all questions for a specific set
 */
export async function getQuestionsBySet(setId, forceRefresh = false) {
  if (cachedQuestionsBySet.has(setId) && !forceRefresh) {
    return cachedQuestionsBySet.get(setId)
  }

  try {
    const snapshot = await getDocs(
      query(collection(db, 'questions'), where('setId', '==', setId))
    )

    const questions = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0
        const timeB = b.createdAt?.toMillis?.() || 0
        return timeB - timeA
      })

    cachedQuestionsBySet.set(setId, questions)
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
    const payload = {
      setId,
      question: questionData.question,
      letterA: questionData.letterA,
      letterB: questionData.letterB,
      letterC: questionData.letterC,
      letterD: questionData.letterD,
      correctAnswer: questionData.correctAnswer,
      createdAt: serverTimestamp(),
    }

    if (questionData.notes != null) {
      payload.notes = questionData.notes
    }

    if (questionData.originalQuestionId) {
      payload.originalQuestionId = questionData.originalQuestionId
    }

    if (questionData.sourceSetId) {
      payload.sourceSetId = questionData.sourceSetId
    }

    const docRef = await addDoc(collection(db, 'questions'), payload)

    cachedQuestionsBySet.delete(setId)
    cachedSets = null

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
    const updatePayload = {
      question: questionData.question,
      letterA: questionData.letterA,
      letterB: questionData.letterB,
      letterC: questionData.letterC,
      letterD: questionData.letterD,
      correctAnswer: questionData.correctAnswer,
    }

    if (questionData.notes != null) {
      updatePayload.notes = questionData.notes
    }

    await updateDoc(ref, updatePayload)

    // Invalidate all cached question lists to keep updates fresh
    cachedQuestionsBySet.clear()
    cachedSets = null
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
    
    cachedQuestionsBySet.delete(setId)
    cachedSets = null

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

    cachedSets = null
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to update question count')
  }
}


// folder related utilities
export async function updateFolder(folderId, name, color = '#3b82f6') {
  try {
    const trimmedName = name.trim()
    const ref = doc(db, 'folders', folderId)
    await updateDoc(ref, { name: trimmedName, color })
    cachedFolders = null
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to update folder')
  }
}

export async function deleteFolder(folderId) {
  try {
    const setsSnapshot = await getDocs(
      query(collection(db, 'questionSets'), where('folderId', '==', folderId))
    )

    for (const docSnap of setsSnapshot.docs) {
      await updateDoc(doc(db, 'questionSets', docSnap.id), {
        folderId: '',
      })
    }

    const ref = doc(db, 'folders', folderId)
    await deleteDoc(ref)

    cachedFolders = null
    cachedSets = null
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to delete folder')
  }
}