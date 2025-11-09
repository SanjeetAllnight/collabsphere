import { 
  collection, 
  doc, 
  addDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  getDoc,
  setDoc,
  getDocs,
  where,
  limit
} from 'firebase/firestore';
import { firestore } from './firebase';
import { getUserById } from './db';

/**
 * Generate a consistent chat ID from two user UIDs
 * Format: ${min(uid1, uid2)}_${max(uid1, uid2)}
 * @param {string} uid1 - First user ID
 * @param {string} uid2 - Second user ID
 * @returns {string} Chat ID
 */
export const getChatId = (uid1, uid2) => {
  const sorted = [uid1, uid2].sort();
  return `${sorted[0]}_${sorted[1]}`;
};

/**
 * Send a direct message
 * @param {string} chatId - Chat ID
 * @param {string} senderId - Sender user ID
 * @param {string} text - Message text
 * @returns {Promise<{success: boolean, messageId: string | null, error: string | null}>}
 */
export const sendDirectMessage = async (chatId, senderId, text) => {
  try {
    const messagesRef = collection(firestore, `chats/${chatId}/messages`);
    
    const messageData = {
      senderId,
      text: text.trim(),
      createdAt: serverTimestamp(),
      read: false,
    };

    const docRef = await addDoc(messagesRef, messageData);

    // Update chat metadata (last message, timestamp)
    const chatRef = doc(firestore, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) {
      // Create chat document if it doesn't exist
      const [uid1, uid2] = chatId.split('_');
      await setDoc(chatRef, {
        participants: [uid1, uid2],
        lastMessage: text.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: senderId,
        createdAt: serverTimestamp(),
      });
    } else {
      // Update existing chat
      await updateDoc(chatRef, {
        lastMessage: text.trim(),
        lastMessageTime: serverTimestamp(),
        lastMessageSenderId: senderId,
      });
    }

    // Mark unread for the other participant
    const [uid1, uid2] = chatId.split('_');
    const otherUserId = uid1 === senderId ? uid2 : uid1;
    
    const unreadRef = doc(firestore, `chats/${chatId}/unread`, otherUserId);
    const unreadSnap = await getDoc(unreadRef);
    const currentCount = unreadSnap.exists() ? (unreadSnap.data().count || 0) : 0;
    
    await setDoc(unreadRef, {
      count: currentCount + 1,
      lastUpdated: serverTimestamp(),
    }, { merge: true });

    return { success: true, messageId: docRef.id, error: null };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, messageId: null, error: error.message };
  }
};

/**
 * Listen to real-time messages in a chat
 * @param {string} chatId - Chat ID
 * @param {string} currentUserId - Current user ID (to mark messages as read)
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToDirectMessages = (chatId, currentUserId, callback) => {
  try {
    const messagesRef = collection(firestore, `chats/${chatId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const messages = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          messages.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt || new Date(),
          });
        });

        // Mark messages as read
        const unreadRef = doc(firestore, `chats/${chatId}/unread`, currentUserId);
        await setDoc(unreadRef, {
          count: 0,
          lastUpdated: serverTimestamp(),
        }, { merge: true });

        callback({ success: true, messages, error: null });
      },
      (error) => {
        console.error('Error listening to messages:', error);
        callback({ success: false, messages: [], error: error.message });
      }
    );

    return unsubscribe;
  } catch (error) {
    callback({ success: false, messages: [], error: error.message });
    return () => {};
  }
};

/**
 * Get all chats for a user (recent chats with last message preview)
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToUserChats = (userId, callback) => {
  try {
    const chatsRef = collection(firestore, 'chats');
    // Fetch without orderBy to avoid composite index requirement, sort client-side
    const q = query(
      chatsRef,
      where('participants', 'array-contains', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const chats = [];
        
        for (const docSnap of querySnapshot.docs) {
          const chatData = docSnap.data();
          const chatId = docSnap.id;
          
          // Get the other participant
          const otherUserId = chatData.participants.find(id => id !== userId);
          
          // Get unread count
          const unreadSnap = await getDoc(doc(firestore, `chats/${chatId}/unread`, userId));
          const unreadCount = unreadSnap.exists() ? (unreadSnap.data().count || 0) : 0;
          
          // Get other user's profile
          let otherUserProfile = null;
          if (otherUserId) {
            const { success, user } = await getUserById(otherUserId);
            if (success && user) {
              otherUserProfile = user;
            }
          }

          // Parse lastMessageTime for sorting
          const lastMessageTime = chatData.lastMessageTime?.toDate 
            ? chatData.lastMessageTime.toDate() 
            : (chatData.lastMessageTime ? new Date(chatData.lastMessageTime) : null);
          const lastMessageTimestamp = lastMessageTime ? lastMessageTime.getTime() : 0;

          chats.push({
            id: chatId,
            otherUserId,
            otherUserProfile,
            lastMessage: chatData.lastMessage || '',
            lastMessageTime: lastMessageTime ? lastMessageTime.toISOString() : null,
            lastMessageSenderId: chatData.lastMessageSenderId || null,
            unreadCount,
            _lastMessageTimestamp: lastMessageTimestamp, // For sorting
          });
        }

        // Sort by lastMessageTime descending (newest first) - client-side
        chats.sort((a, b) => (b._lastMessageTimestamp || 0) - (a._lastMessageTimestamp || 0));

        // Apply limit after sorting
        const limitedChats = chats.slice(0, 50);

        // Remove temporary sorting field
        const cleanedChats = limitedChats.map(({ _lastMessageTimestamp, ...chat }) => chat);

        callback({ success: true, chats: cleanedChats, error: null });
      },
      (error) => {
        console.error('Error listening to chats:', error);
        callback({ success: false, chats: [], error: error.message });
      }
    );

    return unsubscribe;
  } catch (error) {
    callback({ success: false, chats: [], error: error.message });
    return () => {};
  }
};

/**
 * Set typing indicator
 * @param {string} chatId - Chat ID
 * @param {string} userId - User ID
 * @param {boolean} isTyping - Whether user is typing
 */
export const setTypingIndicator = async (chatId, userId, isTyping) => {
  try {
    const typingRef = doc(firestore, `chats/${chatId}/typing`, userId);
    if (isTyping) {
      await setDoc(typingRef, {
        isTyping: true,
        timestamp: serverTimestamp(),
      });
    } else {
      await updateDoc(typingRef, {
        isTyping: false,
        timestamp: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error setting typing indicator:', error);
  }
};

/**
 * Listen to typing indicators
 * @param {string} chatId - Chat ID
 * @param {string} currentUserId - Current user ID (to exclude from typing indicators)
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToTyping = (chatId, currentUserId, callback) => {
  try {
    const typingRef = collection(firestore, `chats/${chatId}/typing`);
    
    const unsubscribe = onSnapshot(
      typingRef,
      (querySnapshot) => {
        const typingUsers = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (doc.id !== currentUserId && data.isTyping) {
            typingUsers.push(doc.id);
          }
        });
        callback(typingUsers);
      },
      (error) => {
        console.error('Error listening to typing:', error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    callback([]);
    return () => {};
  }
};

