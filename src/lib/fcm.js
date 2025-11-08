import { messaging } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';

// VAPID key - This should be generated from Firebase Console
// For now, using a placeholder. In production, get this from Firebase Console > Project Settings > Cloud Messaging
const VAPID_KEY = 'YOUR_VAPID_KEY_HERE'; // Replace with your actual VAPID key

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string | null>} FCM token or null
 */
export const requestNotificationPermission = async () => {
  if (!messaging) {
    console.warn('Messaging not available (server-side)');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register service worker if not already registered
      let registration = null;
      if ('serviceWorker' in navigator) {
        try {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered:', registration);
        } catch (swError) {
          console.warn('Service Worker registration failed:', swError);
        }
      }

      const tokenOptions = { vapidKey: VAPID_KEY };
      if (registration) {
        tokenOptions.serviceWorkerRegistration = registration;
      }

      const token = await getToken(messaging, tokenOptions);
      console.log('FCM Token:', token);
      return token;
    } else {
      console.warn('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

/**
 * Save FCM token to user's document in Firestore
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
export const saveFCMToken = async (userId, token) => {
  if (!token || !userId) return;

  try {
    const { firestore } = await import('./firebase');
    const { doc, setDoc } = await import('firebase/firestore');
    
    const userRef = doc(firestore, 'users', userId);
    await setDoc(userRef, {
      fcmToken: token,
      fcmTokenUpdatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

/**
 * Set up FCM message listener for foreground notifications
 * @param {Function} callback - Callback function to handle messages
 */
export const setupFCMListener = (callback) => {
  if (!messaging) {
    console.warn('Messaging not available');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('Message received:', payload);
    if (callback) {
      callback(payload);
    }
  });
};

