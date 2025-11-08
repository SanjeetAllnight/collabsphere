'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/contexts/ChatContext';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import { listenToTyping, setTypingIndicator } from '@/lib/directMessages';

export default function ChatMain() {
  const { selectedChatId, messages, user, typingUsers, setTypingUsers } = useChat();
  const messagesEndRef = useRef(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen to typing indicators
  useEffect(() => {
    if (!selectedChatId || !user) {
      setTypingUsers([]);
      return;
    }

    const unsubscribe = listenToTyping(selectedChatId, user.uid, (typingUserIds) => {
      setTypingUsers(typingUserIds);
    });

    return () => unsubscribe();
  }, [selectedChatId, user, setTypingUsers]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!selectedChatId || !user) return;

    if (!isTyping) {
      setIsTyping(true);
      setTypingIndicator(selectedChatId, user.uid, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setTypingIndicator(selectedChatId, user.uid, false);
    }, 2000);
  };

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (selectedChatId && user && isTyping) {
        setTypingIndicator(selectedChatId, user.uid, false);
      }
    };
  }, [selectedChatId, user, isTyping]);

  if (!selectedChatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a chat to start messaging</h3>
          <p className="text-gray-500">Choose a conversation from the sidebar</p>
        </motion.div>
      </div>
    );
  }

  const { chats } = useChat();
  const otherUserId = typingUsers[0];
  const otherUserProfile = chats.find(c => c.id === selectedChatId)?.otherUserProfile;

  return (
    <div className="flex-1 flex flex-col bg-white/40 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 bg-white/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {otherUserProfile && (
            <>
              {otherUserProfile.profileImageUrl ? (
                <img
                  src={otherUserProfile.profileImageUrl}
                  alt={otherUserProfile.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {(otherUserProfile.name || otherUserProfile.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {otherUserProfile.name || otherUserProfile.email || 'Unknown User'}
                </h3>
                <p className="text-xs text-gray-500">Active now</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === user?.uid}
              showAvatar={index === 0 || messages[index - 1]?.senderId !== message.senderId}
            />
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator otherUserProfile={otherUserProfile} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onTyping={handleTyping} />
    </div>
  );
}

