'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { getChatId } from '@/lib/directMessages';
import { ensureGroupChat } from '@/lib/groupChat';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id;
  
  const [user, setUser] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [error, setError] = useState('');

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

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!projectId) return;

    const projectRef = doc(firestore, 'projects', projectId);
    const unsubscribe = onSnapshot(projectRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setProject({
          id: snapshot.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        });
        setLoading(false);
      } else {
        setError('Project not found');
        setLoading(false);
      }
    }, (error) => {
      console.error('Error fetching project:', error);
      setError('Failed to load project');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const commentsRef = collection(firestore, 'comments');
    const q = query(
      commentsRef,
      where('projectId', '==', projectId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const allComments = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        allComments.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
          replies: [],
        });
      });

      // Build threaded structure
      const commentsMap = new Map();
      allComments.forEach(comment => commentsMap.set(comment.id, comment));

      const rootComments = [];
      commentsMap.forEach((comment) => {
        if (comment.parentId) {
          const parent = commentsMap.get(comment.parentId);
          if (parent) {
            parent.replies.push(comment);
          } else {
            rootComments.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    }, (error) => {
      console.error('Error fetching comments:', error);
    });

    return () => unsubscribe();
  }, [projectId]);

  const handleUpvote = async () => {
    if (!user || !project || upvoting) return;

    const hasUpvoted = project.upvoters?.includes(user.uid);
    
    setUpvoting(true);
    try {
      const method = hasUpvoted ? 'DELETE' : 'POST';
      const response = await fetch('/api/upvotes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, userId: user.uid }),
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to upvote');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setUpvoting(false);
    }
  };

  const handleComment = async (parentId = null) => {
    if (!user || !commentText.trim() && !replyText.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      const text = parentId ? replyText : commentText;
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          userId: user.uid,
          userEmail: user.email,
          text: text.trim(),
          parentId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (parentId) {
          setReplyText('');
          setReplyingTo(null);
        } else {
          setCommentText('');
        }
      } else {
        setError(data.error || 'Failed to post comment');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleMessage = (ownerId) => {
    if (!user || !ownerId) return;
    router.push(`/messages?userId=${ownerId}`);
  };

  const handleOpenTeamChat = async () => {
    if (!user || !projectId) return;
    
    const { success, error } = await ensureGroupChat(projectId, user.uid);
    if (success) {
      router.push(`/chat/project/${projectId}`);
    } else {
      setError(error || 'Failed to open team chat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-red-600">{error || 'Project not found'}</div>
      </div>
    );
  }

  const hasUpvoted = project.upvoters?.includes(user?.uid) || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Project Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-8 mb-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
              <div className="flex items-center gap-3 mb-4">
                {project.category && (
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                    {project.category}
                  </span>
                )}
                <span className="text-sm text-gray-500">
                  by {project.ownerEmail || 'Unknown'}
                </span>
              </div>
            </div>
            <button
              onClick={handleUpvote}
              disabled={upvoting || !user}
              className={`px-4 py-2 rounded-xl font-semibold transition-all hover:scale-105 ${
                hasUpvoted
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {upvoting ? '...' : `▲ ${project.upvotes || 0}`}
            </button>
          </div>

          <p className="text-gray-700 mb-6 whitespace-pre-wrap leading-relaxed">{project.description}</p>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Required Skills */}
          {project.requiredSkills && project.requiredSkills.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {project.requiredSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            {user && project.ownerId !== user.uid && (
              <button
                onClick={() => handleMessage(project.ownerId)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all hover:scale-105"
              >
                Message Owner
              </button>
            )}
            {user && (
              <button
                onClick={handleOpenTeamChat}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-105"
              >
                Open Team Chat
              </button>
            )}
          </div>
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Discussion ({comments.length})
          </h2>

          {/* Comment Input */}
          {user && (
            <div className="mb-6">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition resize-none"
              />
              <button
                onClick={() => handleComment()}
                disabled={submitting || !commentText.trim()}
                className="mt-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-105 disabled:opacity-50"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{comment.userEmail || 'Anonymous'}</span>
                        <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                      </div>
                      <p className="text-gray-700 mb-2">{comment.text}</p>
                      {user && (
                        <button
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          {replyingTo === comment.id ? 'Cancel' : 'Reply'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reply Input */}
                  {replyingTo === comment.id && user && (
                    <div className="ml-8 mt-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition resize-none"
                      />
                      <button
                        onClick={() => handleComment(comment.id)}
                        disabled={submitting || !replyText.trim()}
                        className="mt-2 px-3 py-1 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        {submitting ? 'Posting...' : 'Post Reply'}
                      </button>
                    </div>
                  )}

                  {/* Nested Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-8 mt-3 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="border-l-2 border-gray-200 pl-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 text-sm">{reply.userEmail || 'Anonymous'}</span>
                            <span className="text-xs text-gray-500">{formatTimeAgo(reply.createdAt)}</span>
                          </div>
                          <p className="text-gray-700 text-sm">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

