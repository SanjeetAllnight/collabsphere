'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { listenToUserChats, listenToDirectMessages, sendDirectMessage, getChatId } from '@/lib/directMessages';
import { requestNotificationPermission, saveFCMToken, setupFCMListener } from '@/lib/fcm';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setLoading(false);
    }

    return () => unsubscribe();
  }, []);

  // Listen to user's chats
  useEffect(() => {
    if (!user) return;

    const unsubscribe = listenToUserChats(user.uid, ({ success, chats: fetchedChats, error }) => {
      if (success) {
        setChats(fetchedChats);
      } else {
        console.error('Error fetching chats:', error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Listen to messages in selected chat
  useEffect(() => {
    if (!user || !selectedChatId) {
      setMessages([]);
      return;
    }

    let previousMessageCount = 0;

    const unsubscribe = listenToDirectMessages(selectedChatId, user.uid, ({ success, messages: fetchedMessages, error }) => {
      if (success) {
        // Show toast notification for new messages (not sent by current user)
        if (fetchedMessages.length > previousMessageCount && previousMessageCount > 0) {
          const newMessages = fetchedMessages.slice(previousMessageCount);
          newMessages.forEach((msg) => {
            if (msg.senderId !== user.uid) {
              const chat = chats.find(c => c.id === selectedChatId);
              const senderName = chat?.otherUserProfile?.name || chat?.otherUserProfile?.email || 'Someone';
              toast(`${senderName}: ${msg.text}`, {
                icon: '💬',
                duration: 4000,
              });
            }
          });
        }
        previousMessageCount = fetchedMessages.length;
        setMessages(fetchedMessages);
      } else {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      }
    });

    return () => unsubscribe();
  }, [user, selectedChatId, chats]);

  // Set up FCM notifications
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    // Request notification permission and get token
    requestNotificationPermission().then((token) => {
      if (token) {
        saveFCMToken(user.uid, token);
      }
    });

    // Set up FCM message listener for foreground notifications
    const unsubscribe = setupFCMListener((payload) => {
      const notification = payload.notification;
      if (notification) {
        toast(notification.body || notification.title, {
          icon: '🔔',
          duration: 5000,
        });
      }
    });

    return () => unsubscribe();
  }, [user]);

  const sendMessage = useCallback(async (text) => {
    if (!user || !selectedChatId || !text.trim() || sending) return;

    setSending(true);
    const { success, error } = await sendDirectMessage(selectedChatId, user.uid, text);
    
    if (success) {
      // Message sent successfully
    } else {
      toast.error(error || 'Failed to send message');
    }
    
    setSending(false);
  }, [user, selectedChatId, sending]);

  const selectChat = useCallback((chatId) => {
    setSelectedChatId(chatId);
  }, []);

  const startChatWithUser = useCallback((otherUserId) => {
    if (!user) return;
    const chatId = getChatId(user.uid, otherUserId);
    setSelectedChatId(chatId);
  }, [user]);

  const value = {
    user,
    chats,
    selectedChatId,
    messages,
    loading,
    sending,
    typingUsers,
    sendMessage,
    selectChat,
    startChatWithUser,
    setTypingUsers,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

