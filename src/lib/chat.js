import { 
  collection, 
  doc, 
  addDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { firestore } from './firebase';
import { addNotification, getUserById } from './db';
import { getChatId } from './directMessages';

/**
 * Generate a consistent chat room ID from two user IDs
 * Ensures the same room ID regardless of parameter order
 * @param {string} user1 - First user ID
 * @param {string} user2 - Second user ID
 * @returns {string} Chat room ID
 */
export const getChatRoomId = (user1, user2) => {
  // Sort user IDs to ensure consistent room ID regardless of order
  const sortedUsers = [user1, user2].sort();
  return `${sortedUsers[0]}_${sortedUsers[1]}`;
};

/**
 * Send a message to a chat room
 * Creates a message document in the messages subcollection
 * Also sends a notification to the receiver
 * @param {string} chatRoomId - Chat room ID (format: "user1_user2")
 * @param {string} senderId - ID of the user sending the message
 * @param {string} message - Message text
 * @param {string} senderName - Name of the sender (for notification)
 * @returns {Promise<{success: boolean, messageId: string | null, error: string | null}>}
 */
export const sendMessage = async (chatRoomId, senderId, message, senderName) => {
  try {
    // Get or create chat room document reference
    const chatRoomRef = doc(firestore, 'chatRooms', chatRoomId);
    
    // Get messages subcollection reference
    const messagesRef = collection(chatRoomRef, 'messages');
    
    // Add message to subcollection
    const docRef = await addDoc(messagesRef, {
      senderId,
      message,
      createdAt: new Date().toISOString(),
    });

    // Extract receiver ID from chatRoomId (format: "user1_user2" sorted)
    const userIds = chatRoomId.split('_');
    const receiverId = userIds[0] === senderId ? userIds[1] : userIds[0];

    // Send notification to receiver
    if (receiverId && senderName) {
      await addNotification(receiverId, {
        title: 'New Message',
        description: `${senderName} sent you a message`,
        type: 'message',
        link: `/chat/${chatRoomId}`,
      });
    }

    return { success: true, messageId: docRef.id, error: null };
  } catch (error) {
    return { success: false, messageId: null, error: error.message };
  }
};

/**
 * Listen to real-time messages in a chat room
 * Returns an unsubscribe function to stop listening
 * @param {string} chatRoomId - Chat room ID
 * @param {Function} callback - Callback function that receives messages array and error
 * @returns {Function} Unsubscribe function to stop listening
 */
export const listenToMessages = (chatRoomId, callback) => {
  try {
    // Get chat room document reference
    const chatRoomRef = doc(firestore, 'chatRooms', chatRoomId);
    
    // Get messages subcollection reference
    const messagesRef = collection(chatRoomRef, 'messages');
    
    // Create query ordered by createdAt (oldest first)
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const messages = [];
        querySnapshot.forEach((doc) => {
          messages.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        callback({ success: true, messages, error: null });
      },
      (error) => {
        callback({ success: false, messages: [], error: error.message });
      }
    );

    return unsubscribe;
  } catch (error) {
    callback({ success: false, messages: [], error: error.message });
    // Return a no-op function if subscription fails
    return () => {};
  }
};

/**
 * Send a collaboration request
 * Creates a notification for the receiver with a link to the chat
 * @param {string} senderId - ID of the user sending the request
 * @param {string} receiverId - ID of the user receiving the request
 * @param {string} postId - ID of the post related to the collaboration
 * @returns {Promise<{success: boolean, notificationId: string | null, error: string | null}>}
 */
export async function sendCollabRequest(senderId, receiverId, postId) {
  try {
    // Get sender's name
    const { success, user: sender } = await getUserById(senderId);
    const senderName = sender?.name || sender?.email || 'Someone';

    // Fetch post data to get project title
    let projectTitle = 'this project';
    if (postId) {
      try {
        const postRef = doc(firestore, 'posts', postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          projectTitle = postData.title || 'this project';
        }
      } catch (postError) {
        console.error('Error fetching post:', postError);
        // Continue with default title if post fetch fails
      }
    }

    // Generate chat ID
    const chatId = getChatId(senderId, receiverId);

    // Create notification with updated format
    const notificationsRef = collection(firestore, 'notifications');
    const notificationData = {
      userId: receiverId,
      title: 'New Collaboration Invite',
      message: `${senderName} wants to collaborate on '${projectTitle}'`,
      link: `/chat/${chatId}`,
      createdAt: serverTimestamp(),
      read: false,
    };

    const docRef = await addDoc(notificationsRef, notificationData);

    return { success: true, notificationId: docRef.id, error: null };
  } catch (error) {
    return { success: false, notificationId: null, error: error.message };
  }
}

