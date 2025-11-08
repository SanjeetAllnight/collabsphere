'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '@/contexts/ChatContext';
import UserStatus from '@/components/UserStatus';

export default function ChatSidebar({ onClose }) {
  const { chats, selectedChatId, selectChat, user } = useChat();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter((chat) => {
    if (!searchQuery) return true;
    const name = chat.otherUserProfile?.name || chat.otherUserProfile?.email || 'Unknown';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200/50 bg-white/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Messages
          </h2>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="text-sm">No chats yet. Start a conversation!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            <AnimatePresence>
              {filteredChats.map((chat, index) => {
                const isSelected = chat.id === selectedChatId;
                const otherUser = chat.otherUserProfile;
                const name = otherUser?.name || otherUser?.email || 'Unknown User';
                const avatar = otherUser?.profileImageUrl;

                return (
                  <motion.div
                    key={chat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      selectChat(chat.id);
                      onClose();
                    }}
                    className={`p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 backdrop-blur-sm border-l-4 border-indigo-500'
                        : 'hover:bg-gray-50/80 hover:backdrop-blur-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={name}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-white"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white">
                            {getInitials(name)}
                          </div>
                        )}
                        {chat.otherUserId && (
                          <div className="absolute -bottom-1 -right-1">
                            <UserStatus userId={chat.otherUserId} />
                          </div>
                        )}
                        {chat.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white">
                            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                          </div>
                        )}
                      </div>

                      {/* Chat Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">{name}</h3>
                          {chat.lastMessageTime && (
                            <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                              {formatTime(chat.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {chat.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

