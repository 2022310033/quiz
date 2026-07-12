import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../../firebase/firebase'

const HISTORY_COLLECTION = 'history'

function calculatePercentage(score, totalQuestions) {
  if (!totalQuestions) return 0
  return Math.round((score / totalQuestions) * 100)
}

function buildHistoryPayload(history) {
  const score = Number(history.score || 0)
  const totalQuestions = Number(history.totalQuestions || 0)

  return {
    setId: history.setId || '',
    setName: history.setName || 'Untitled Exam',
    subject: history.subject || 'Uncategorized',
    score,
    totalQuestions,
    percentage: Number(history.percentage ?? calculatePercentage(score, totalQuestions)),
    finishedAt: history.finishedAt || new Date(),
  }
}

export async function saveExamHistory(history) {
  try {
    const payload = buildHistoryPayload(history)
    const docRef = await addDoc(collection(db, HISTORY_COLLECTION), payload)

    return {
      id: docRef.id,
      ...payload,
    }
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to save exam history')
  }
}

export async function getExamHistory() {
  try {
    const snapshot = await getDocs(
      query(collection(db, HISTORY_COLLECTION), orderBy('finishedAt', 'desc'))
    )

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch exam history')
  }
}

export async function getExamHistoryBySet(setId) {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, HISTORY_COLLECTION),
        where('setId', '==', setId),
        orderBy('finishedAt', 'desc')
      )
    )

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }))
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to fetch set history')
  }
}

export async function deleteExamHistory(historyId) {
  try {
    const historyRef = doc(db, HISTORY_COLLECTION, historyId)
    await deleteDoc(historyRef)
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Failed to delete exam history')
  }
}
