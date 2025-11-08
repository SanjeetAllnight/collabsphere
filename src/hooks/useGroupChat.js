import { useState, useEffect, useRef } from 'react';
import { firestore, rtdb } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, onValue, off } from 'firebase/database';
import {
  chatIdForProject,
  sendTextMessage,
  sendFileMessage,
  setTyping,
  markSeen,
} from '@/lib/groupChat';
import { getUserById } from '@/lib/db';

export function useGroupChat(projectId) {
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingMap, setTypingMap] = useState({});
  const [members, setMembers] = useState([]);
  const [lastMessage, setLastMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membersData, setMembersData] = useState({});
  const typingTimeoutRef = useRef(null);

  // Initialize chat - will be called from component with user ID
  // This hook expects the component to call ensureGroupChat separately
  useEffect(() => {
    if (!projectId) return;
    const chatId = chatIdForProject(projectId);
    setChatId(chatId);
    setLoading(false);
  }, [projectId]);

  // Listen to Firestore chat metadata
  useEffect(() => {
    if (!chatId) return;

    const chatRef = doc(firestore, 'groupChats', chatId);
    const unsubscribe = onSnapshot(chatRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMembers(data.members || []);
        setLastMessage(data.lastMessage || null);

        // Fetch member data
        const memberPromises = (data.members || []).map(async (uid) => {
          const { success, user } = await getUserById(uid);
          return { uid, user: success ? user : null };
        });

        Promise.all(memberPromises).then((results) => {
          const membersMap = {};
          results.forEach(({ uid, user }) => {
            membersMap[uid] = user;
          });
          setMembersData(membersMap);
        });
      }
    }, (error) => {
      console.error('Error listening to chat metadata:', error);
    });

    return () => unsubscribe();
  }, [chatId]);

  // Listen to RTDB messages
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = ref(rtdb, `groupChats/${chatId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesList = [];
        snapshot.forEach((childSnapshot) => {
          messagesList.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
        // Sort by timestamp
        messagesList.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(messagesList);
      } else {
        setMessages([]);
      }
    }, (error) => {
      console.error('Error listening to messages:', error);
    });

    return () => {
      off(messagesRef, 'value', unsubscribe);
    };
  }, [chatId]);

  // Listen to typing indicators
  useEffect(() => {
    if (!chatId) return;

    const typingRef = ref(rtdb, `groupChats/${chatId}/typing`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const typing = {};
        snapshot.forEach((childSnapshot) => {
          typing[childSnapshot.key] = childSnapshot.val();
        });
        setTypingMap(typing);
      } else {
        setTypingMap({});
      }
    }, (error) => {
      console.error('Error listening to typing:', error);
    });

    return () => {
      off(typingRef, 'value', unsubscribe);
    };
  }, [chatId]);

  const sendText = async (text, senderId) => {
    if (!chatId || !text.trim() || !senderId) return { success: false };
    return await sendTextMessage(chatId, senderId, text);
  };

  const sendFile = async (file, senderId) => {
    if (!chatId || !file || !senderId) return { success: false };
    return await sendFileMessage(chatId, senderId, file);
  };

  const handleSetTyping = async (isTyping, currentUserId) => {
    if (!chatId || !currentUserId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await setTyping(chatId, currentUserId, isTyping);

    if (isTyping) {
      // Auto-clear typing after 3 seconds
      typingTimeoutRef.current = setTimeout(async () => {
        await setTyping(chatId, currentUserId, false);
      }, 3000);
    }
  };

  const handleMarkSeen = async (currentUserId) => {
    if (!chatId || !currentUserId) return;
    return await markSeen(chatId, currentUserId);
  };

  return {
    chatId,
    messages,
    sendText,
    sendFile,
    typingMap,
    setTyping: handleSetTyping,
    members,
    lastMessage,
    markSeen: handleMarkSeen,
    loading,
    membersData,
  };
}

