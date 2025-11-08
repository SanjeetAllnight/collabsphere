import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  setDoc,
  updateDoc,
  deleteDoc,
  query, 
  orderBy,
  where,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firestore, storage } from './firebase';

/**
 * Save user profile to Firestore
 * Creates or updates a user profile document in the 'users' collection
 * @param {string} userId - User's unique ID
 * @param {string} email - User's email address
 * @param {string} name - User's name
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export const saveUserProfile = async (userId, email, name) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    await setDoc(userRef, {
      email,
      name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Upload profile image to Firebase Storage
 * @param {string} uid - User's unique ID
 * @param {File} imageFile - Image file to upload
 * @returns {Promise<{success: boolean, imageUrl: string | null, error: string | null}>}
 */
export const uploadProfileImage = async (uid, imageFile) => {
  try {
    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return { success: false, imageUrl: null, error: 'File must be an image' };
    }

    // Validate file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return { success: false, imageUrl: null, error: 'Image size must be less than 5MB' };
    }

    // Create storage reference: profile-images/{uid}
    const storageRef = ref(storage, `profile-images/${uid}`);
    
    // Upload file
    await uploadBytes(storageRef, imageFile);
    
    // Get download URL
    const imageUrl = await getDownloadURL(storageRef);

    return { success: true, imageUrl, error: null };
  } catch (error) {
    return { success: false, imageUrl: null, error: error.message };
  }
};

/**
 * Update user profile in Firestore
 * Performs partial update - only updates fields passed in data
 * Firestore path: users/{uid}
 * @param {string} uid - User's unique ID
 * @param {Object} data - Profile data to update (only fields passed will be updated)
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export const updateUserProfile = async (uid, data) => {
  try {
    const userRef = doc(firestore, 'users', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create a new post in Firestore
 * Adds a post document to the 'posts' collection
 * @param {string} userId - ID of the user creating the post
 * @param {string} title - Post title
 * @param {string} description - Post description
 * @param {string} category - Post category
 * @returns {Promise<{success: boolean, postId: string | null, error: string | null}>}
 */
export const createPost = async (userId, title, description, category) => {
  try {
    const postsRef = collection(firestore, 'posts');
    const docRef = await addDoc(postsRef, {
      ownerId: userId,
      title,
      description,
      category,
      createdAt: new Date().toISOString(),
    });

    return { success: true, postId: docRef.id, error: null };
  } catch (error) {
    return { success: false, postId: null, error: error.message };
  }
};

/**
 * Get user data from Firestore by userId
 * @param {string} userId - User's unique ID
 * @returns {Promise<{success: boolean, user: Object | null, error: string | null}>}
 */
export const getUserById = async (userId) => {
  try {
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, user: null, error: 'User not found' };
    }

    return { success: true, user: { id: userSnap.id, ...userSnap.data() }, error: null };
  } catch (error) {
    return { success: false, user: null, error: error.message };
  }
};

/**
 * Get all posts from Firestore
 * Returns all posts ordered by createdAt in descending order (newest first)
 * @returns {Promise<{success: boolean, posts: Array, error: string | null}>}
 */
export const getAllPosts = async () => {
  try {
    const postsRef = collection(firestore, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return { success: true, posts, error: null };
  } catch (error) {
    return { success: false, posts: [], error: error.message };
  }
};

/**
 * Get posts by owner ID
 * Returns posts where ownerId matches the provided userId, ordered by createdAt desc
 * @param {string} userId - User's unique ID
 * @returns {Promise<{success: boolean, posts: Array, error: string | null}>}
 */
export const getPostsByOwner = async (userId) => {
  try {
    const postsRef = collection(firestore, 'posts');
    const q = query(
      postsRef, 
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return { success: true, posts, error: null };
  } catch (error) {
    return { success: false, posts: [], error: error.message };
  }
};

/**
 * Delete a post from Firestore
 * @param {string} postId - Post document ID to delete
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export const deletePost = async (postId) => {
  try {
    const postRef = doc(firestore, 'posts', postId);
    await deleteDoc(postRef);

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe to real-time updates of all posts from Firestore
 * Returns an unsubscribe function to stop listening
 * @param {Function} callback - Callback function that receives posts array and error
 * @returns {Function} Unsubscribe function to stop listening
 */
export const subscribeToPosts = (callback) => {
  try {
    const postsRef = collection(firestore, 'posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const posts = [];
        querySnapshot.forEach((doc) => {
          posts.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        callback({ success: true, posts, error: null });
      },
      (error) => {
        callback({ success: false, posts: [], error: error.message });
      }
    );

    return unsubscribe;
  } catch (error) {
    callback({ success: false, posts: [], error: error.message });
    // Return a no-op function if subscription fails
    return () => {};
  }
};

/**
 * Add a notification for a user
 * Creates a new notification document in notifications collection
 * @param {string} userId - User's unique ID
 * @param {Object} data - Notification data { title, description, type, link? }
 * @returns {Promise<{success: boolean, notificationId: string | null, error: string | null}>}
 */
export async function addNotification(userId, data) {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    
    // Create notification document with flat structure
    const notificationData = {
      userId,
      title: data.title || data.message || '',
      description: data.description || data.message || '',
      type: data.type, // "message" | "request" | "like"
      isRead: false,
      createdAt: new Date(),
    };

    // Add link if provided
    if (data.link) {
      notificationData.link = data.link;
    }

    const docRef = await addDoc(notificationsRef, notificationData);

    return { success: true, notificationId: docRef.id, error: null };
  } catch (error) {
    return { success: false, notificationId: null, error: error.message };
  }
}

/**
 * Request collaboration on a post
 * Sends a notification to the post owner
 * @param {string} postOwnerId - ID of the post owner
 * @param {string} requesterName - Name of the user requesting collaboration
 * @param {string} postId - ID of the post
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export async function requestCollaboration(postOwnerId, requesterName, postId) {
  try {
    await addNotification(postOwnerId, {
      title: 'Collaboration Request',
      description: `${requesterName} wants to collaborate on your post`,
      type: 'request',
      link: `/dashboard`, // Can navigate to post or collaboration page
    });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Mark a notification as read
 * Updates isRead field to true in notifications collection
 * @param {string} notifId - Notification document ID
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export async function markNotificationAsRead(notifId) {
  try {
    const notificationRef = doc(firestore, 'notifications', notifId);
    
    // Update isRead to true
    await updateDoc(notificationRef, {
      isRead: true,
    });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Listen to real-time notifications for a user
 * Returns an unsubscribe function to stop listening
 * @param {string} userId - User's unique ID
 * @param {Function} callback - Callback function that receives notifications array and error
 * @returns {Function} Unsubscribe function to stop listening
 */
export function listenToNotifications(userId, callback) {
  try {
    const notificationsRef = collection(firestore, 'notifications');
    
    // Create query: where userId matches, ordered by createdAt (newest first)
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const notifications = [];
        querySnapshot.forEach((doc) => {
          notifications.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        callback({ success: true, notifications, error: null });
      },
      (error) => {
        callback({ success: false, notifications: [], error: error.message });
      }
    );

    return unsubscribe;
  } catch (error) {
    callback({ success: false, notifications: [], error: error.message });
    // Return a no-op function if subscription fails
    return () => {};
  }
}

