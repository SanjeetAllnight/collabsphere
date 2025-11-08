'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { sendMessage, listenToMessages, sendCollabRequest } from '@/lib/chat';
import { getUserById } from '@/lib/db';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getChatId } from '@/lib/directMessages';
import UserStatus from '@/components/UserStatus';
import MatchScoreCircle from '@/components/ui/MatchScoreCircle';

export default function ChatPage() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [otherUserProfile, setOtherUserProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [error, setError] = useState('');
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const router = useRouter();
  const params = useParams();
  const messagesEndRef = useRef(null);
  const commentsEndRef = useRef(null);
  const chatRoomId = params?.id;
  const postId = params?.id;
  // Check if this is a post (not a chat room - chat rooms have underscore)
  const isPost = postId && !postId.includes('_');

  // Auto-scroll to bottom when new messages or comments arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollCommentsToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollCommentsToBottom();
  }, [comments]);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthChange((currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setLoading(false);
    });

    // Check initial auth state
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setLoading(false);

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    // Fetch user profile to get name
    const fetchUserProfile = async () => {
      if (user) {
        const { success, user: profile } = await getUserById(user.uid);
        if (success && profile) {
          setUserProfile(profile);
        }
      }
    };

    fetchUserProfile();
  }, [user]);

  // Get other user ID from chatRoomId and fetch their profile
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!user || !chatRoomId) return;

      // Extract other user ID from chatRoomId (format: "user1_user2")
      // Only process if chatRoomId contains underscore (indicating it's a user-to-user chat)
      if (chatRoomId.includes('_')) {
        const userIds = chatRoomId.split('_');
        const otherUserId = userIds[0] === user.uid ? userIds[1] : userIds[0];

        if (otherUserId && otherUserId !== user.uid) {
          setOtherUser(otherUserId);
          const { success, user: profile } = await getUserById(otherUserId);
          if (success && profile) {
            setOtherUserProfile(profile);
          }
        }
      }
    };

    fetchOtherUser();
  }, [user, chatRoomId]);

  useEffect(() => {
    if (!loading && user && chatRoomId) {
      // Subscribe to real-time messages
      const unsubscribe = listenToMessages(chatRoomId, ({ success, messages: fetchedMessages, error: msgError }) => {
        if (success) {
          setMessages(fetchedMessages);
        } else {
          setError(msgError || 'Failed to load messages');
        }
      });

      // Cleanup subscription on unmount
      return () => unsubscribe();
    }
  }, [loading, user, chatRoomId]);

  // Real-time comments listener using Firestore onSnapshot
  useEffect(() => {
    if (!loading && user && postId) {
      setCommentsLoading(true);

      // Query comments for the specific post
      // Note: Removed orderBy to avoid requiring composite index
      // We'll sort in JavaScript instead
      const commentsRef = collection(firestore, 'comments');
      const q = query(
        commentsRef,
        where('postId', '==', postId)
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const commentsList = [];
          querySnapshot.forEach((doc) => {
            commentsList.push({
              id: doc.id,
              ...doc.data(),
            });
          });
          
          // Sort comments by createdAt ascending in JavaScript
          commentsList.sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
            return aTime - bTime;
          });
          
          setComments(commentsList);
          setCommentsLoading(false);
        },
        (error) => {
          console.error('Error listening to comments:', error);
          setError('Failed to load comments');
          setCommentsLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    }
  }, [loading, user, postId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !user || !chatRoomId) {
      return;
    }

    setSending(true);
    setError('');

    try {
      // Get sender name for notification
      const senderName = userProfile?.name || user.email || 'Someone';
      const { success, error: sendError } = await sendMessage(chatRoomId, user.uid, messageInput.trim(), senderName);

      if (success) {
        setMessageInput('');
      } else {
        setError(sendError || 'Failed to send message');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();

    if (!commentInput.trim() || !user || !postId) {
      return;
    }

    setSubmittingComment(true);
    setError('');

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          userId: user.uid,
          commentText: commentInput.trim(),
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCommentInput('');
        // Comments will update automatically via onSnapshot listener
      } else {
        setError(data.error || 'Failed to add comment');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSuggestTeammates = async () => {
    if (!postId || !user) return;

    setSuggestionsLoading(true);
    setError('');
    setShowSuggestionsModal(true);

    try {
      const response = await fetch('/api/suggest-teammates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuggestions(data.teammates || []);
      } else {
        setError(data.error || 'Failed to get suggestions');
        setSuggestions([]);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleMessage = (suggestedUserId) => {
    if (!user || !suggestedUserId) return;
    router.push(`/messages?userId=${suggestedUserId}`);
  };

  const handleSendCollabRequest = async (candidateId) => {
    if (!user || !candidateId || !postId) return;
    
    try {
      const { success, error } = await sendCollabRequest(user.uid, candidateId, postId);
      if (success) {
        alert('Collaboration request sent successfully!');
      } else {
        alert(`Failed to send request: ${error}`);
      }
    } catch (err) {
      console.error('Error sending collaboration request:', err);
      alert('An error occurred while sending the request');
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  // Only render if user is logged in
  if (!user || !chatRoomId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* Sidebar - User Status */}
      {chatRoomId && otherUser && (
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Chat Info</h2>
          {otherUserProfile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                  {otherUserProfile.name ? otherUserProfile.name.substring(0, 2).toUpperCase() : otherUserProfile.email?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {otherUserProfile.name || otherUserProfile.email}
                  </p>
                  <UserStatus userId={otherUser} />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Loading user info...</div>
          )}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.back()}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h1 className="text-xl font-semibold text-gray-900">Chat</h1>
              </div>
            </div>
          </div>
        </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isOwnMessage = msg.senderId === user.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                        isOwnMessage
                          ? 'bg-indigo-600 text-white rounded-br-sm'
                          : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-indigo-200' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Post Details Section - Show for posts only */}
          {isPost && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Post Details</h2>
                <button
                  onClick={handleSuggestTeammates}
                  disabled={suggestionsLoading}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {suggestionsLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Finding teammates...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Suggest Teammates with AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Comments Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments</h2>
            
            {commentsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading comments...</p>
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No comments yet. Be the first to comment!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-gray-900 text-sm">{comment.userEmail}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</p>
                    </div>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.commentText}</p>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 pb-2">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {/* Message Input */}
          {chatRoomId && (
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !messageInput.trim()}
                className="bg-indigo-600 text-white px-6 py-2 rounded-full font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
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
              </button>
            </form>
          )}

          {/* Comment Input */}
          {postId && (
            <form onSubmit={handleSubmitComment} className="flex gap-3">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                disabled={submittingComment}
              />
              <button
                type="submit"
                disabled={submittingComment || !commentInput.trim()}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                {submittingComment ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Posting...</span>
                  </>
                ) : (
                  'Post'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
      </div>

      {/* Suggestions Modal - Full Screen Centered Dialog */}
      <AnimatePresence>
        {showSuggestionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-xl"
              onClick={() => setShowSuggestionsModal(false)}
            ></motion.div>

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="glass-card max-w-3xl w-full rounded-3xl p-8 space-y-6 mx-auto flex flex-col overflow-hidden max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">AI Teammate Suggestions</h2>
                  <p className="text-gray-600 text-sm mt-1">Top matches for your project</p>
                </div>
                <button
                  onClick={() => setShowSuggestionsModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {suggestionsLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <svg className="h-16 w-16 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </motion.div>
                    <p className="text-gray-600 font-medium">Finding the best teammates...</p>
                  </motion.div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-gray-500">No suggestions available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {suggestions.map((suggestion, index) => (
                        <motion.div
                          key={suggestion.uid || suggestion.userId || index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.1, duration: 0.3 }}
                          whileHover={{ y: -4 }}
                          className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 shadow-md hover:shadow-xl transition-all"
                        >
                          {/* Header: Avatar + Name + Match Score Circle */}
                          <div className="flex items-start gap-4 mb-3">
                            {/* Avatar Circle */}
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                              {(suggestion.name || 'U')[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-gray-900 mb-1">{suggestion.name}</h3>
                            </div>
                            <MatchScoreCircle score={suggestion.matchScore || suggestion.score || 0} size={80} strokeWidth={8} />
                          </div>

                          {/* Badges: Preferred Role & Personality Style */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {suggestion.preferredRole && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                                {suggestion.preferredRole}
                              </span>
                            )}
                            {suggestion.personalityStyle && (
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                                suggestion.personalityStyle === 'Creative' || suggestion.personalityStyle === 'Flexible'
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                  : 'bg-blue-100 text-blue-700 border-blue-200'
                              }`}>
                                {suggestion.personalityStyle}
                              </span>
                            )}
                          </div>

                          {/* Availability & Experience Level */}
                          <div className="flex flex-wrap gap-4 mb-4 text-xs text-gray-600">
                            {suggestion.availability && (
                              <span>
                                <span className="font-semibold">Availability:</span> {suggestion.availability}
                              </span>
                            )}
                            {suggestion.experienceLevel && (
                              <span>
                                <span className="font-semibold">Experience:</span> {suggestion.experienceLevel}
                              </span>
                            )}
                          </div>

                          {/* Match Score Progress Bar */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700">Skill Alignment</span>
                              <span className="text-sm font-bold text-purple-600">
                                {suggestion.matchScore || suggestion.score || 0}%
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${suggestion.matchScore || suggestion.score || 0}%` }}
                                transition={{ delay: index * 0.1 + 0.2, duration: 0.5, ease: 'easeOut' }}
                                className="h-2 rounded-full bg-purple-600"
                              />
                            </div>
                          </div>


                          {/* Reason */}
                          {suggestion.reason && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                                {suggestion.reason}
                              </p>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-3 mt-6">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleMessage(suggestion.uid || suggestion.userId)}
                              className="flex-1 px-4 py-2.5 border-2 border-purple-600 text-purple-600 text-sm font-semibold rounded-xl hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all"
                            >
                              Message
                            </motion.button>
                            
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleSendCollabRequest(suggestion.uid || suggestion.userId)}
                              className="flex-1 px-4 py-2.5 btn-primary text-sm font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-md"
                            >
                              Invite to Collaborate
                            </motion.button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

