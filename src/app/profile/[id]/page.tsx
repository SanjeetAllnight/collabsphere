'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { getUserById, getPostsByOwner } from '@/lib/db';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import UserStatus from '@/components/UserStatus';

export default function UserProfilePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [profilePosts, setProfilePosts] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const profileUserId = params?.id as string;

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      setLoading(false);
    });

    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    setLoading(false);

    return () => unsubscribe();
  }, [router]);

  // Fetch profile user data
  useEffect(() => {
    const fetchProfileUser = async () => {
      if (!profileUserId || loading) return;

      setProfileLoading(true);
      try {
        const { success, user: profile, error: profileError } = await getUserById(profileUserId);

        if (success && profile) {
          setProfileUser(profile);
        } else {
          setError(profileError || 'User not found');
        }
      } catch (err) {
        setError('Failed to load profile');
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfileUser();
  }, [profileUserId, loading]);

  // Fetch profile posts
  useEffect(() => {
    const fetchProfilePosts = async () => {
      if (!profileUserId || loading) return;

      setPostsLoading(true);
      try {
        const { success, posts, error: postsError } = await getPostsByOwner(profileUserId);

        if (success) {
          setProfilePosts(posts);
        } else {
          console.error('Failed to load posts:', postsError);
        }
      } catch (err) {
        console.error('Error loading posts:', err);
      } finally {
        setPostsLoading(false);
      }
    };

    fetchProfilePosts();
  }, [profileUserId, loading]);

  // Check if current user follows profile user and get counts
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !profileUserId || loading) return;

      try {
        // Check if current user follows profile user
        const followingRef = doc(firestore, 'following', currentUser.uid, 'userFollowing', profileUserId);
        const followingSnap = await getDoc(followingRef);
        setIsFollowing(followingSnap.exists());

        // Get followers count: followers/{profileUserId}/userFollowers
        const followersRef = collection(firestore, 'followers', profileUserId, 'userFollowers');
        const followersSnapshot = await getDocs(followersRef);
        setFollowersCount(followersSnapshot.size);

        // Get following count: following/{profileUserId}/userFollowing
        const followingCollectionRef = collection(firestore, 'following', profileUserId, 'userFollowing');
        const followingCollectionSnapshot = await getDocs(followingCollectionRef);
        setFollowingCount(followingCollectionSnapshot.size);
      } catch (err) {
        console.error('Error checking follow status:', err);
      }
    };

    checkFollowStatus();
  }, [currentUser, profileUserId, loading]);

  const handleFollowToggle = async () => {
    if (!currentUser || !profileUserId || followLoading) return;

    setFollowLoading(true);
    try {
      const endpoint = isFollowing ? '/api/follow' : '/api/follow';
      const method = isFollowing ? 'DELETE' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followerId: currentUser.uid,
          followingId: profileUserId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update follow status
        setIsFollowing(!isFollowing);

        // Update followers count
        if (isFollowing) {
          setFollowersCount((prev) => Math.max(0, prev - 1));
        } else {
          setFollowersCount((prev) => prev + 1);
        }
      } else {
        setError(data.error || 'Failed to update follow status');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  // Get user initials for avatar
  const getInitials = (name: string, email: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.trim().substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">User not found</p>
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Don't show follow button if viewing own profile
  const isOwnProfile = currentUser?.uid === profileUserId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                {getInitials(profileUser.name || '', profileUser.email || '')}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {profileUser.name || profileUser.email}
                </h1>
                <p className="text-gray-600 mb-2">{profileUser.email}</p>
                <UserStatus userId={profileUserId} />
                {profileUser.skills && Array.isArray(profileUser.skills) && profileUser.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profileUser.skills.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {!isOwnProfile && (
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-6 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {followLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Followers/Following Stats */}
          <div className="flex gap-6 mt-6 pt-6 border-t border-gray-200">
            <div>
              <span className="text-2xl font-bold text-gray-900">{followersCount}</span>
              <span className="text-gray-600 ml-2">Followers</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-gray-900">{followingCount}</span>
              <span className="text-gray-600 ml-2">Following</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Posts Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Posts</h2>

          {postsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading posts...</p>
            </div>
          ) : profilePosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No posts yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profilePosts.map((post) => (
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
                  <p className="text-gray-700 whitespace-pre-wrap">{post.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

