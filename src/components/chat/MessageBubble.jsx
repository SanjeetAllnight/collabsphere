'use client';

import { motion } from 'framer-motion';
import { useChat } from '@/contexts/ChatContext';

export default function MessageBubble({ message, isOwn, showAvatar }) {
  const { chats, selectedChatId } = useChat();
  const chat = chats.find(c => c.id === selectedChatId);
  const otherUser = chat?.otherUserProfile;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0">
          {otherUser?.profileImageUrl ? (
            <img
              src={otherUser.profileImageUrl}
              alt={otherUser.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
              {getInitials(otherUser?.name || otherUser?.email)}
            </div>
          )}
        </div>
      )}

      <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-sm'
              : 'bg-white/80 backdrop-blur-sm text-gray-900 rounded-bl-sm shadow-sm'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
          <p
            className={`text-xs mt-1 ${
              isOwn ? 'text-indigo-100' : 'text-gray-500'
            }`}
          >
            {formatTime(message.createdAt)}
          </p>
        </motion.div>
      </div>

      {isOwn && showAvatar && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
            You
          </div>
        </div>
      )}
    </motion.div>
  );
}

