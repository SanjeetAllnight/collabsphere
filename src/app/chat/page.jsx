'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';

export default function ChatListPage() {
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
    if (!user) return;

    const chatsRef = collection(firestore, 'groupChats');
    const q = query(
      chatsRef,
      where('members', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsList = [];
      const promises = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        promises.push(
          (async () => {
            // Get project details
            const projectRef = doc(firestore, 'projects', data.projectId);
            const projectSnap = await getDoc(projectRef);
            const projectData = projectSnap.exists() ? projectSnap.data() : null;

            chatsList.push({
              id: docSnap.id,
              ...data,
              project: projectData,
            });
          })()
        );
      });

      await Promise.all(promises);
      setChats(chatsList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching chats:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Group Chats</h1>
          <p className="text-gray-600">Collaborate with your team in real-time</p>
        </div>

        {chats.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-lg">No group chats yet. Join a project to start chatting!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chats.map((chat, index) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link href={`/chat/project/${chat.projectId}`}>
                  <div className="bg-white/70 backdrop-blur-md rounded-xl shadow-md border border-gray-100 p-5 hover:shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                          {chat.project?.title || 'Untitled Project'}
                        </h3>
                        {chat.lastMessage && (
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {chat.lastMessage.text || '📎 File'}
                          </p>
                        )}
                        {!chat.lastMessage && (
                          <p className="text-sm text-gray-400 italic">No messages yet</p>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <span className="text-xs text-gray-500 ml-4">
                          {formatTimeAgo(chat.lastMessage.at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-gray-500">
                        {chat.members?.length || 0} member{chat.members?.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

