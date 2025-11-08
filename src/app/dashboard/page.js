'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser, logoutUser, onAuthChange } from '@/lib/auth';
import { getUserById, requestCollaboration } from '@/lib/db';
import { getChatRoomId } from '@/lib/chat';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [collaborating, setCollaborating] = useState(null);
  const router = useRouter();

  const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Others'];

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthChange((currentUser) => {
      if (!currentUser) {
        // User is not logged in, redirect to login
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
    // Fetch current user profile to get name
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

  // Fetch posts from API
  const fetchPosts = async (category = 'All') => {
    if (!user) return;

    setPostsLoading(true);
    try {
      const url = category === 'All' 
        ? '/api/posts' 
        : `/api/posts?category=${encodeURIComponent(category)}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.posts) {
        // Map posts to include ownerEmail (use email from post if available, otherwise fetch)
        const postsWithOwner = await Promise.all(
          data.posts.map(async (post) => {
            // If post already has email field, use it
            if (post.email) {
              return {
                ...post,
                ownerEmail: post.email,
              };
            }
            // Otherwise fetch owner email
            if (post.ownerId) {
              const { success: userSuccess, user: owner } = await getUserById(post.ownerId);
              return {
                ...post,
                ownerEmail: userSuccess && owner ? owner.email : 'Unknown',
              };
            }
            return { ...post, ownerEmail: 'Unknown' };
          })
        );
        setPosts(postsWithOwner);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && user) {
      fetchPosts(selectedCategory);
    }
  }, [loading, user, selectedCategory]);

  const handleLogout = async () => {
    const { error } = await logoutUser();
    if (!error) {
      router.push('/login');
    }
  };

  const handleMessage = (postOwnerId) => {
    if (!user || !postOwnerId) return;
    
    // Don't allow messaging yourself
    if (user.uid === postOwnerId) return;
    
    const chatRoomId = getChatRoomId(user.uid, postOwnerId);
    router.push(`/chat/${chatRoomId}`);
  };

  const handleCollaborate = async (postOwnerId, postId) => {
    if (!user || !userProfile || !postOwnerId) return;
    
    // Don't allow collaborating on your own post
    if (user.uid === postOwnerId) return;

    setCollaborating(postId);

    try {
      const requesterName = userProfile.name || user.email || 'Someone';
      const { success, error: collabError } = await requestCollaboration(postOwnerId, requesterName, postId);

      if (success) {
        // Show success message (you can use a toast or alert)
        alert('Collaboration request sent!');
      } else {
        alert(collabError || 'Failed to send collaboration request');
      }
    } catch (err) {
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setCollaborating(null);
    }
  };

  // Posts are already filtered by API, so use posts directly
  const filteredPosts = posts;

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  // Only render if user is logged in (shouldn't reach here if not, but safety check)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">CollabSphere</h1>
              <p className="text-gray-600">Welcome, <span className="font-semibold text-indigo-600">{user.email}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/create-post"
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
              >
                Create Post
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">All Posts</h2>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-200">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                  // fetchPosts will be triggered by useEffect when selectedCategory changes
                }}
                disabled={postsLoading}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${postsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {category}
              </button>
            ))}
          </div>

          {postsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
              <p className="text-gray-600">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">
                {selectedCategory === 'All' 
                  ? 'No posts yet' 
                  : `No posts in ${selectedCategory} category`}
              </p>
              {selectedCategory !== 'All' && (
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Show all posts
                </button>
              )}
              {selectedCategory === 'All' && (
                <Link
                  href="/dashboard/create-post"
                  className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Create the first post
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <div
                  key={post.id}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-semibold text-gray-900">{post.title}</h3>
                        {post.category && (
                          <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                            {post.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 ml-4">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Posted by:</span> {post.ownerEmail}
                    </div>
                    {post.ownerId && post.ownerId !== user.uid && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCollaborate(post.ownerId, post.id)}
                          disabled={collaborating === post.id}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {collaborating === post.id ? 'Requesting...' : 'Collaborate'}
                        </button>
                        <button
                          onClick={() => handleMessage(post.ownerId)}
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
                        >
                          Message
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

