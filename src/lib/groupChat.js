import { firestore, rtdb, storage } from './firebase';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { ref, push, set, onValue, off, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addNotification } from './db';
import { getUserById } from './db';

/**
 * Generate chat ID for a project
 */
export function chatIdForProject(projectId) {
  return `project_${projectId}`;
}

/**
 * Ensure a group chat exists for a project
 * Creates if missing, syncs members from project
 * Adds current user to members if not present
 */
export async function ensureGroupChat(projectId, currentUserId = null) {
  const chatId = chatIdForProject(projectId);
  const chatRef = doc(firestore, 'groupChats', chatId);

  try {
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      // Get project to find owner
      const projectRef = doc(firestore, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);

      if (!projectSnap.exists()) {
        throw new Error('Project not found');
      }

      const projectData = projectSnap.data();
      const members = [projectData.ownerId].filter(Boolean);
      
      // Add current user if provided and not owner
      if (currentUserId && currentUserId !== projectData.ownerId && !members.includes(currentUserId)) {
        members.push(currentUserId);
      }

      // Create group chat
      await setDoc(chatRef, {
        chatId,
        projectId,
        members,
        lastMessage: null,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Sync members from project (add owner and current user if not present)
      const projectRef = doc(firestore, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);

      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        const chatData = chatSnap.data();
        const members = [...(chatData.members || [])];

        // Add owner if not present
        if (projectData.ownerId && !members.includes(projectData.ownerId)) {
          members.push(projectData.ownerId);
        }

        // Add current user if provided and not already a member
        if (currentUserId && !members.includes(currentUserId)) {
          members.push(currentUserId);
        }

        // Update if members changed
        if (members.length !== chatData.members?.length) {
          await updateDoc(chatRef, {
            members,
          });
        }
      }
    }

    return { success: true, chatId };
  } catch (error) {
    console.error('Error ensuring group chat:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a text message to a group chat
 */
export async function sendTextMessage(chatId, senderId, text) {
  if (!senderId) {
    throw new Error('senderId is required');
  }
  
  try {
    const messagesRef = ref(rtdb, `groupChats/${chatId}/messages`);
    const messageRef = push(messagesRef);

    const messageData = {
      senderId,
      text: text.trim(),
      timestamp: Date.now(),
      seenBy: { [senderId]: true },
    };

    await set(messageRef, messageData);

    // Update last message in Firestore
    const chatRef = doc(firestore, 'groupChats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: text.trim(),
        senderId,
        at: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    // Notify members
    await notifyMembersOnMessage(chatId, senderId, text.trim());

    return { success: true, messageId: messageRef.key };
  } catch (error) {
    console.error('Error sending text message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a file message to a group chat
 */
export async function sendFileMessage(chatId, senderId, file) {
  if (!senderId) {
    throw new Error('senderId is required');
  }
  
  try {
    // Upload file to Storage
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const fileRef = storageRef(storage, `chat_uploads/${chatId}/${fileName}`);

    await uploadBytes(fileRef, file);
    const fileUrl = await getDownloadURL(fileRef);

    // Determine file type
    const fileType = file.type || 'application/octet-stream';

    // Store message in RTDB
    const messagesRef = ref(rtdb, `groupChats/${chatId}/messages`);
    const messageRef = push(messagesRef);

    const messageData = {
      senderId,
      fileUrl,
      fileType,
      fileName: file.name,
      timestamp: Date.now(),
      seenBy: { [senderId]: true },
    };

    await set(messageRef, messageData);

    // Update last message in Firestore
    const chatRef = doc(firestore, 'groupChats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        fileUrl,
        senderId,
        at: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    });

    // Notify members
    await notifyMembersOnMessage(chatId, senderId, `📎 ${file.name}`);

    return { success: true, messageId: messageRef.key, fileUrl };
  } catch (error) {
    console.error('Error sending file message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Listen to messages in a group chat
 */
export function listenToMessages(chatId, callback) {
  const messagesRef = ref(rtdb, `groupChats/${chatId}/messages`);

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (snapshot.exists()) {
      const messages = [];
      snapshot.forEach((childSnapshot) => {
        messages.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });
      // Sort by timestamp
      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      callback({ success: true, messages });
    } else {
      callback({ success: true, messages: [] });
    }
  }, (error) => {
    console.error('Error listening to messages:', error);
    callback({ success: false, messages: [], error: error.message });
  });

  return () => off(messagesRef, 'value', unsubscribe);
}

/**
 * Set typing indicator
 */
export async function setTyping(chatId, uid, isTyping) {
  try {
    const typingRef = ref(rtdb, `groupChats/${chatId}/typing/${uid}`);
    if (isTyping) {
      await set(typingRef, true);
    } else {
      await remove(typingRef);
    }
    return { success: true };
  } catch (error) {
    console.error('Error setting typing indicator:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark messages as seen
 */
export async function markSeen(chatId, uid) {
  try {
    const messagesRef = ref(rtdb, `groupChats/${chatId}/messages`);
    
    // Get all messages and update seenBy
    return new Promise((resolve, reject) => {
      onValue(messagesRef, async (snapshot) => {
        try {
          if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach((childSnapshot) => {
              const messageData = childSnapshot.val();
              if (!messageData.seenBy || !messageData.seenBy[uid]) {
                updates[`${childSnapshot.key}/seenBy/${uid}`] = true;
              }
            });

            if (Object.keys(updates).length > 0) {
              await update(messagesRef, updates);
            }
          }
          off(messagesRef, 'value');
          resolve({ success: true });
        } catch (error) {
          off(messagesRef, 'value');
          reject(error);
        }
      }, (error) => {
        reject(error);
      });
    });
  } catch (error) {
    console.error('Error marking messages as seen:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify all members except sender when a message is sent
 */
export async function notifyMembersOnMessage(chatId, senderId, previewTextOrFile) {
  try {
    const chatRef = doc(firestore, 'groupChats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      return { success: false, error: 'Chat not found' };
    }

    const chatData = chatSnap.data();
    const members = chatData.members || [];
    const projectId = chatData.projectId;

    // Get sender name
    const { success, user: sender } = await getUserById(senderId);
    const senderName = sender?.name || sender?.email || 'Someone';

    // Create notifications for all members except sender
    const notificationPromises = members
      .filter((memberId) => memberId !== senderId)
      .map((memberId) =>
        addNotification(memberId, {
          title: 'New Group Chat Message',
          description: `${senderName}: ${previewTextOrFile}`,
          type: 'group_chat',
          link: `/chat/project/${projectId}`,
        })
      );

    await Promise.all(notificationPromises);

    return { success: true };
  } catch (error) {
    console.error('Error notifying members:', error);
    return { success: false, error: error.message };
  }
}

