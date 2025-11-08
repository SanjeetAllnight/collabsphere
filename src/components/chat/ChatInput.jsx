'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useChat } from '@/contexts/ChatContext';

export default function ChatInput({ onTyping }) {
  const { selectedChatId, sendMessage, sending } = useChat();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    await sendMessage(input);
    setInput('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (onTyping) {
      onTyping();
    }
  };

  if (!selectedChatId) return null;

  return (
    <div className="p-4 border-t border-gray-200/50 bg-white/60 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="w-full px-4 py-3 pr-12 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
            disabled={sending}
          />
          {/* Emoji button placeholder */}
          <button
            type="button"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => {
              // Emoji picker can be added here
              setInput(input + '😊');
            }}
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <motion.button
          type="submit"
          disabled={!input.trim() || sending}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-medium hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
        >
          {sending ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>Send</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}

