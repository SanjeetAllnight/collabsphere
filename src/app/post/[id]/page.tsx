'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getUserById } from '@/lib/db';
import Link from 'next/link';

export default function PostDetailPage() {
  const [user, setUser] = useState<any>(null);
  const [post, setPost] = useState<any>(null);
  const [postOwner, setPostOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const postId = params?.id as string;

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
    });

    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;

      try {
        const postRef = doc(firestore, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          const postData = { id: postSnap.id, ...postSnap.data() } as any;
          setPost(postData);

          // Fetch post owner
          if (postData.ownerId) {
            const { success, user: owner } = await getUserById(postData.ownerId);
            if (success && owner) {
              setPostOwner(owner);
            }
          }
        } else {
          setPost(null);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <Link href="/explore" className="text-indigo-600 hover:text-indigo-700 font-medium mb-4 inline-block">
              ← Back to Explore
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">{post.title}</h1>
          
          {post.category && (
            <span className="inline-block px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full mb-4">
              {post.category}
            </span>
          )}

          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{post.description}</p>

          {postOwner && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 mb-2">Posted by</p>
              <Link 
                href={`/profile/${postOwner.id}`}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {postOwner.name || postOwner.email}
              </Link>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href={`/chat/${postId}`}
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              View Comments & Chat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

