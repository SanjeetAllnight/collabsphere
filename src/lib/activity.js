import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';

/**
 * Log an activity to Firestore
 * @param {string} userId - User ID who performed the activity
 * @param {string} type - Activity type: "created_project" | "commented" | "upvoted" | "followed" | "collab_request"
 * @param {Object} payload - Additional data about the activity
 * @returns {Promise<{success: boolean, activityId: string | null, error: string | null}>}
 */
export async function logActivity(userId, type, payload = {}) {
  try {
    const activitiesRef = collection(firestore, 'activities');
    
    const activityData = {
      userId,
      type,
      payload,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(activitiesRef, activityData);

    return { success: true, activityId: docRef.id, error: null };
  } catch (error) {
    console.error('Error logging activity:', error);
    return { success: false, activityId: null, error: error.message };
  }
}

