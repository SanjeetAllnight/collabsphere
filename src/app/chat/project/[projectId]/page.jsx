'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { useGroupChat } from '@/hooks/useGroupChat';
import { ensureGroupChat } from '@/lib/groupChat';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

export default function GroupChatPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId;
  const [user, setUser] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [presence, setPresence] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const {
    chatId,
    messages,
    sendText,
    sendFile,
    typingMap,
    setTyping,
    members,
    markSeen,
    loading,
    membersData,
  } = useGroupChat(projectId);

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
    });

    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    // Ensure group chat exists and user is added
    if (projectId && currentUser) {
      ensureGroupChat(projectId, currentUser.uid);
    }

    return () => unsubscribe();
  }, [router, projectId]);

  // Listen to presence
  useEffect(() => {
    if (!members || members.length === 0) return;

    const presenceRefs = members.map((uid) => {
      const presenceRef = ref(rtdb, `presence/${uid}`);
      const unsubscribe = onValue(presenceRef, (snapshot) => {
        setPresence((prev) => ({
          ...prev,
          [uid]: snapshot.val() || { state: 'offline' },
        }));
      });
      return { ref: presenceRef, unsubscribe };
    });

    return () => {
      presenceRefs.forEach(({ ref, unsubscribe }) => {
        off(ref, 'value', unsubscribe);
      });
    };
  }, [members]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as seen when new messages arrive
  useEffect(() => {
    if (user && chatId && messages.length > 0) {
      // Debounce markSeen to avoid too many calls
      const timeoutId = setTimeout(() => {
        if (markSeen) {
          markSeen(user.uid).catch(console.error);
        }
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [user, chatId, messages.length, markSeen]);

  const handleSendText = async () => {
    if (!messageText.trim() || !user) return;

    const result = await sendText(messageText, user.uid);
    if (result.success) {
      setMessageText('');
      setTyping(false, user.uid);
    }
  };

  const handleSendFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const result = await sendFile(file, user.uid);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTyping = (e) => {
    if (!user) return;
    setMessageText(e.target.value);
    setTyping(true, user.uid);
  };

  const getTypingUsers = () => {
    if (!typingMap || !user) return [];
    return Object.keys(typingMap)
      .filter((uid) => uid !== user.uid && typingMap[uid])
      .map((uid) => membersData[uid]?.name || membersData[uid]?.email || 'Someone');
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading chat...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const typingUsers = getTypingUsers();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Project Chat</h1>
              <div className="flex items-center gap-2 mt-1">
                {members.slice(0, 5).map((uid) => {
                  const member = membersData[uid];
                  const isOnline = presence[uid]?.state === 'online';
                  return (
                    <div key={uid} className="relative">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                        {member?.name?.[0] || member?.email?.[0] || '?'}
                      </div>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                  );
                })}
                {members.length > 5 && (
                  <span className="text-xs text-gray-500">+{members.length - 5}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => {
              const isMine = message.senderId === user.uid;
              const sender = membersData[message.senderId];
              const senderName = sender?.name || sender?.email || 'Unknown';

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                    {!isMine && (
                      <p className="text-xs text-gray-500 mb-1 px-2">{senderName}</p>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isMine
                          ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.text && <p className="text-sm font-medium">{message.text}</p>}
                      {message.fileUrl && (
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium underline"
                        >
                          📎 {message.fileName || 'File'}
                        </a>
                      )}
                      <p className={`text-xs mt-1 ${isMine ? 'text-purple-100' : 'text-gray-500'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 pb-2">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-gray-500 italic">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white/70 backdrop-blur-md border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleSendFile}
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>
          <input
            type="text"
            value={messageText}
            onChange={handleTyping}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
          />
          <button
            onClick={handleSendText}
            disabled={!messageText.trim()}
            className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

