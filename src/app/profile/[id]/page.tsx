'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { getUserById, getPostsByOwner } from '@/lib/db';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
      const endpoint = '/api/follow';
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
        setIsFollowing(!isFollowing);
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

  const isOwnProfile = currentUser?.uid === profileUserId;
  const techSkills = Array.isArray(profileUser.techSkills) 
    ? profileUser.techSkills 
    : (Array.isArray(profileUser.skills) ? profileUser.skills : []);
  const nonTechSkills = Array.isArray(profileUser.nonTechSkills) ? profileUser.nonTechSkills : [];
  const interests = Array.isArray(profileUser.interests) ? profileUser.interests : [];
  const recentProjects = Array.isArray(profileUser.recentProjects) ? profileUser.recentProjects : [];
  const achievements = Array.isArray(profileUser.achievements) ? profileUser.achievements : [];

  // Build subheader
  const subheaderParts = [
    profileUser.college,
    profileUser.branch,
    profileUser.year,
    profileUser.degree,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-[900px] mx-auto">
        {/* Main Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-3xl p-8 shadow-xl space-y-8"
        >
          {/* Header: Avatar + Name */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* Avatar with Gradient Circle */}
            {profileUser.profileImageUrl ? (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 p-1 mb-4">
                <img
                  src={profileUser.profileImageUrl}
                  alt={profileUser.name || 'User'}
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg mb-4">
                {getInitials(profileUser.name || '', profileUser.email || '')}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {profileUser.name || profileUser.email}
            </h1>
            {subheaderParts.length > 0 && (
              <p className="text-gray-600 text-sm mb-3">
                {subheaderParts.join(' • ')}
              </p>
            )}
            <div className="flex items-center gap-3 mb-4">
              <UserStatus userId={profileUserId} />
              <div className="flex gap-4 text-sm text-gray-600">
                <span><span className="font-semibold">{followersCount}</span> Followers</span>
                <span><span className="font-semibold">{followingCount}</span> Following</span>
              </div>
            </div>
            {!isOwnProfile && (
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-500'
                    : 'btn-primary'
                } disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
              >
                {followLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>

          {/* Tech Skills Section */}
          {techSkills.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Tech Skills</h2>
              <div className="flex flex-wrap gap-2">
                {techSkills.map((skill: string, index: number) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="badge bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {/* Non-Tech Skills Section */}
          {nonTechSkills.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Non-Tech Skills</h2>
              <div className="flex flex-wrap gap-2">
                {nonTechSkills.map((skill: string, index: number) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="badge bg-gray-200 text-gray-700 border border-gray-300"
                  >
                    {skill}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {/* Interests Section */}
          {interests.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Interests</h2>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest: string, index: number) => (
                  <motion.span
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="badge bg-purple-50 text-purple-700 border-2 border-purple-300"
                  >
                    {interest}
                  </motion.span>
                ))}
              </div>
            </div>
          )}

          {/* Preferred Role + Experience + Availability */}
          {(profileUser.preferredRole || profileUser.experienceLevel || profileUser.availability) && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Role & Availability</h2>
              <div className="flex flex-wrap gap-4">
                {profileUser.preferredRole && (
                  <div className="bg-indigo-50 rounded-lg px-4 py-2 border border-indigo-200">
                    <p className="text-xs text-indigo-600 font-semibold mb-1">Preferred Role</p>
                    <p className="text-sm font-medium text-gray-900">{profileUser.preferredRole}</p>
                  </div>
                )}
                {profileUser.experienceLevel && (
                  <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold mb-1">Experience</p>
                    <p className="text-sm font-medium text-gray-900">{profileUser.experienceLevel}</p>
                  </div>
                )}
                {profileUser.availability && (
                  <div className="bg-green-50 rounded-lg px-4 py-2 border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-1">Availability</p>
                    <p className="text-sm font-medium text-gray-900">{profileUser.availability}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Personality Style */}
          {profileUser.personalityStyle && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Personality Style</h2>
              <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                {profileUser.personalityStyle}
              </span>
            </div>
          )}

          {/* Links Section */}
          {(profileUser.github || profileUser.linkedin || profileUser.portfolio) && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Links</h2>
              <div className="flex flex-wrap gap-3">
                {profileUser.github && (
                  <a
                    href={profileUser.github.startsWith('http') ? profileUser.github : `https://${profileUser.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all hover:scale-105 shadow-md"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span className="font-medium">GitHub</span>
                  </a>
                )}
                {profileUser.linkedin && (
                  <a
                    href={profileUser.linkedin.startsWith('http') ? profileUser.linkedin : `https://${profileUser.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-md"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    <span className="font-medium">LinkedIn</span>
                  </a>
                )}
                {profileUser.portfolio && (
                  <a
                    href={profileUser.portfolio.startsWith('http') ? profileUser.portfolio : `https://${profileUser.portfolio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all hover:scale-105 shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    <span className="font-medium">Portfolio</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Recent Projects Section */}
          {recentProjects.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Recent Projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentProjects.map((project: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 hover:shadow-md hover-up transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{project.title}</h3>
                      {project.link && (
                        <a
                          href={project.link.startsWith('http') ? project.link : `https://${project.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 ml-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{project.description}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Achievements Section */}
          {achievements.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Achievements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-yellow-50/80 backdrop-blur-sm rounded-2xl p-4 border border-yellow-200 hover:shadow-md hover-up transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm">{achievement.title}</h3>
                      {achievement.link && (
                        <a
                          href={achievement.link.startsWith('http') ? achievement.link : `https://${achievement.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 ml-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      )}
                    </div>
                    {achievement.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{achievement.description}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </motion.div>

        {/* Posts Section - Separate Card */}
        {profilePosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-3xl p-8 shadow-xl mt-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Posts</h2>
            {postsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading posts...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {profilePosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all"
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
          </motion.div>
        )}
      </div>
    </div>
  );
}
