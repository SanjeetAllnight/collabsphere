'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  limit,
  where,
  Timestamp
} from 'firebase/firestore';
import UserStatus from '@/components/UserStatus';

interface Post {
  id: string;
  title: string;
  description: string;
  category?: string;
  ownerId: string;
  email?: string;
  createdAt: any;
  likes?: number;
  commentsCount?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  skills?: string[];
  followersCount?: number;
  createdAt: any;
  profileImageUrl?: string;
}

export default function ExplorePage() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ posts: Post[]; users: User[] }>({ posts: [], users: [] });
  const [searching, setSearching] = useState(false);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<User[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const router = useRouter();

  // Debounce function
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Fetch user profile
  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser || null);
      setLoading(false);
    });

    const currentUser = getCurrentUser();
    setUser(currentUser || null);
    setLoading(false);

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { getUserById } = await import('@/lib/db');
          const { success, user: profile } = await getUserById(user.uid);
          if (success && profile) {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };
    fetchUserProfile();
  }, [user]);

  // Search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults({ posts: [], users: [] });
      setSearching(false);
      return;
    }

    setSearching(true);
    try {
      const searchLower = query.toLowerCase().trim();
      
      // Search posts
      const postsRef = collection(firestore, 'posts');
      const postsSnapshot = await getDocs(postsRef);
      const posts: Post[] = [];
      postsSnapshot.forEach((doc) => {
        const data = doc.data();
        const title = (data.title || '').toLowerCase();
        const description = (data.description || '').toLowerCase();
        if (title.includes(searchLower) || description.includes(searchLower)) {
          posts.push({
            id: doc.id,
            ...data,
          } as Post);
        }
      });

      // Search users
      const usersRef = collection(firestore, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const users: User[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const name = (data.name || '').toLowerCase();
        const email = (data.email || '').toLowerCase();
        if (name.includes(searchLower) || email.includes(searchLower)) {
          users.push({
            id: doc.id,
            ...data,
          } as User);
        }
      });

      setSearchResults({ posts, users });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ posts: [], users: [] });
    } finally {
      setSearching(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      performSearch(query);
    }, 300),
    [performSearch]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Fetch trending posts
  useEffect(() => {
    const fetchTrendingPosts = async () => {
      try {
        const postsRef = collection(firestore, 'posts');
        const postsSnapshot = await getDocs(postsRef);
        const posts: Post[] = [];
        
        postsSnapshot.forEach((doc) => {
          const data = doc.data();
          posts.push({
            id: doc.id,
            ...data,
            likes: data.likes || 0,
            commentsCount: data.commentsCount || 0,
          } as Post);
        });

        // Sort by engagement (likes + comments)
        posts.sort((a, b) => {
          const engagementA = (a.likes || 0) + (a.commentsCount || 0);
          const engagementB = (b.likes || 0) + (b.commentsCount || 0);
          return engagementB - engagementA;
        });

        setTrendingPosts(posts.slice(0, 12));
      } catch (error) {
        console.error('Error fetching trending posts:', error);
      } finally {
        setPostsLoading(false);
      }
    };

    if (!loading) {
      fetchTrendingPosts();
    }
  }, [loading]);

  // Fetch recommended and recent users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(firestore, 'users');
        const usersSnapshot = await getDocs(usersRef);
        const allUsers: User[] = [];
        
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          allUsers.push({
            id: doc.id,
            ...data,
            followersCount: data.followersCount || 0,
            skills: data.skills || [],
          } as User);
        });

        // Recent users (by createdAt desc)
        const recent = [...allUsers].sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        setRecentUsers(recent.slice(0, 8));

        // Recommended users (matching skills + most followers)
        if (userProfile?.skills && Array.isArray(userProfile.skills) && userProfile.skills.length > 0) {
          const userSkills = userProfile.skills.map((s: string) => s.toLowerCase());
          const recommended = allUsers
            .filter(u => u.id !== user?.uid)
            .map(u => {
              const userSkillsLower = (u.skills || []).map((s: string) => s.toLowerCase());
              const matchingSkills = userSkillsLower.filter(s => userSkills.includes(s)).length;
              return { ...u, matchingSkills, score: matchingSkills * 10 + (u.followersCount || 0) };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 8)
            .map(({ matchingSkills, score, ...u }) => u);
          setRecommendedUsers(recommended);
        } else {
          // If no skills, just show users with most followers
          const recommended = allUsers
            .filter(u => u.id !== user?.uid)
            .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
            .slice(0, 8);
          setRecommendedUsers(recommended);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    if (!loading && userProfile) {
      fetchUsers();
    }
  }, [loading, userProfile, user]);

  const getInitials = (name: string, email: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  const showSearchResults = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users and posts..."
              className="w-full px-6 py-4 text-lg rounded-2xl border-2 border-indigo-200 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-200 bg-white/80 backdrop-blur-lg shadow-lg transition-all"
            />
            {searching && (
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
          </motion.div>
        </div>

        {/* Search Results */}
        <AnimatePresence>
          {showSearchResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Search Results</h2>
              
              {searchResults.posts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Posts ({searchResults.posts.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {searchResults.posts.map((post) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        className="bg-white/60 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20 cursor-pointer"
                        onClick={() => router.push(`/post/${post.id}`)}
                      >
                        <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h4>
                        <p className="text-sm text-gray-600 line-clamp-3">{post.description}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.users.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-3">Users ({searchResults.users.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {searchResults.users.map((user) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        className="bg-white/60 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20 cursor-pointer"
                        onClick={() => router.push(`/profile/${user.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          {user.profileImageUrl ? (
                            <img src={user.profileImageUrl} alt={user.name} className="w-12 h-12 rounded-full" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                              {getInitials(user.name, user.email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-600 truncate">{user.email}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {!searching && searchResults.posts.length === 0 && searchResults.users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No results found for "{searchQuery}"
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content (when not searching) */}
        {!showSearchResults && (
          <>
            {/* Trending Posts */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">🔥 Trending Posts</h2>
              {postsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white/60 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20 animate-pulse">
                      <div className="h-4 bg-gray-300 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {trendingPosts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className="bg-white/60 backdrop-blur-lg rounded-xl p-5 shadow-lg border border-white/20 cursor-pointer hover:shadow-xl transition-all"
                        onClick={() => router.push(`/post/${post.id}`)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-gray-900 line-clamp-2 flex-1">{post.title}</h3>
                          {post.category && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full whitespace-nowrap">
                              {post.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3 mb-3">{post.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>❤️ {post.likes || 0}</span>
                          <span>💬 {post.commentsCount || 0}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.section>

            {/* Recommended Users */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">⭐ Recommended Users</h2>
              {usersLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white/60 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {recommendedUsers.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className="bg-white/60 backdrop-blur-lg rounded-xl p-5 shadow-lg border border-white/20 cursor-pointer hover:shadow-xl transition-all"
                        onClick={() => router.push(`/profile/${user.id}`)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {user.profileImageUrl ? (
                            <img src={user.profileImageUrl} alt={user.name} className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg border-2 border-indigo-500">
                              {getInitials(user.name, user.email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-600 truncate">{user.email}</p>
                          </div>
                        </div>
                        <UserStatus userId={user.id} />
                        {user.skills && user.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {user.skills.slice(0, 3).map((skill, i) => (
                              <span key={i} className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-2 text-xs text-gray-500">
                          👥 {user.followersCount || 0} followers
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.section>

            {/* Recent Users */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-6">🆕 Recent Users</h2>
              {usersLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white/60 backdrop-blur-lg rounded-xl p-4 shadow-lg border border-white/20 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <AnimatePresence>
                    {recentUsers.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                        className="bg-white/60 backdrop-blur-lg rounded-xl p-5 shadow-lg border border-white/20 cursor-pointer hover:shadow-xl transition-all"
                        onClick={() => router.push(`/profile/${user.id}`)}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {user.profileImageUrl ? (
                            <img src={user.profileImageUrl} alt={user.name} className="w-14 h-14 rounded-full object-cover border-2 border-indigo-500" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg border-2 border-indigo-500">
                              {getInitials(user.name, user.email)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-600 truncate">{user.email}</p>
                          </div>
                        </div>
                        <UserStatus userId={user.id} />
                        <div className="mt-2 text-xs text-gray-500">
                          Joined {formatTimeAgo(user.createdAt)}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.section>
          </>
        )}
      </div>
    </div>
  );
}

