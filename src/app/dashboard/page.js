'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getCurrentUser, logoutUser, onAuthChange } from '@/lib/auth';
import { getUserById, requestCollaboration } from '@/lib/db';
import { getChatRoomId } from '@/lib/chat';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getRecommendedProjects } from '@/lib/recommend';

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [recommendedProjects, setRecommendedProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [collaborating, setCollaborating] = useState(null);
  const [upvoting, setUpvoting] = useState(null);
  const router = useRouter();

  const categories = ['All', 'WebDev', 'AI/ML', 'IoT', 'AppDev', 'Cybersec', 'Blockchain', 'Others'];

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

  // Fetch projects from API
  const fetchProjects = async (category = 'All') => {
    if (!user) return;

    setProjectsLoading(true);
    try {
      const url = category === 'All' 
        ? '/api/projects' 
        : `/api/projects?category=${encodeURIComponent(category)}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.projects) {
        setProjects(data.projects);
        
        // Compute recommendations if user profile is loaded
        if (userProfile) {
          const recommended = getRecommendedProjects(data.projects, userProfile, 5);
          setRecommendedProjects(recommended);
        }
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Fetch recommended projects
  useEffect(() => {
    if (userProfile && projects.length > 0) {
      const recommended = getRecommendedProjects(projects, userProfile, 5);
      setRecommendedProjects(recommended);
    }
  }, [userProfile, projects]);

  // Fetch upcoming events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events?limit=3');
        const data = await response.json();
        if (data.success) {
          setUpcomingEvents(data.events.slice(0, 3));
        }
      } catch (err) {
        console.error('Error fetching events:', err);
      }
    };
    fetchEvents();
  }, []);

  // Real-time activities listener
  useEffect(() => {
    if (!user) return;

    const activitiesRef = collection(firestore, 'activities');
    const q = query(
      activitiesRef,
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const activitiesList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        activitiesList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        });
      });
      setActivities(activitiesList);
    }, (error) => {
      console.error('Error listening to activities:', error);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!loading && user) {
      fetchProjects(selectedCategory);
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

  const handleUpvote = async (projectId) => {
    if (!user || !projectId || upvoting === projectId) return;

    setUpvoting(projectId);
    try {
      const project = projects.find(p => p.id === projectId);
      const hasUpvoted = project?.upvoters?.includes(user.uid);

      const method = hasUpvoted ? 'DELETE' : 'POST';
      const response = await fetch('/api/upvotes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userId: user.uid }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh projects
        fetchProjects(selectedCategory);
      } else {
        alert(data.error || 'Failed to upvote');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setUpvoting(null);
    }
  };

  const handleCollaborate = async (projectOwnerId, projectId) => {
    if (!user || !userProfile || !projectOwnerId) return;
    
    if (user.uid === projectOwnerId) return;

    setCollaborating(projectId);

    try {
      const requesterName = userProfile.name || user.email || 'Someone';
      const { success, error: collabError } = await requestCollaboration(projectOwnerId, requesterName, projectId);

      if (success) {
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

  const getActivityMessage = (activity) => {
    switch (activity.type) {
      case 'created_project':
        return 'created a project';
      case 'commented':
        return 'commented on a project';
      case 'upvoted':
        return 'upvoted a project';
      case 'followed':
        return 'followed a user';
      case 'collab_request':
        return 'sent a collaboration request';
      default:
        return 'performed an action';
    }
  };

  const filteredProjects = projects;

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">CollabSphere</h1>
              <p className="text-gray-600">Welcome, <span className="font-semibold text-indigo-600">{userProfile?.name || user.email}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/create-post"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-105"
              >
                Create Project
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-700 transition-all hover:scale-105"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activities */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Activities</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {activities.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No recent activities</p>
                ) : (
                  activities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-gray-200 pb-3 last:border-0"
                    >
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">{activity.userId === user.uid ? 'You' : 'Someone'}</span>{' '}
                        {getActivityMessage(activity)}
                        <span className="text-gray-500 ml-2">{formatTimeAgo(activity.createdAt)}</span>
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Recommended Projects */}
            {recommendedProjects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6"
              >
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Recommended Projects</h2>
                  <Link
                    href="/explore"
                    className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                  >
                    See more →
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex gap-4 pb-4">
                    {recommendedProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="min-w-[300px] bg-white rounded-xl shadow-md border border-gray-200 p-4 hover:shadow-xl transition-all hover:scale-105"
                      >
                        <Link href={`/project/${project.id}`}>
                          <h3 className="font-bold text-gray-900 mb-2 line-clamp-1">{project.title}</h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                          {project.tags && project.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {project.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Score: {project.recommendationScore || 0}</span>
                            <span className="text-xs text-indigo-600">▲ {project.upvotes || 0}</span>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* All Projects */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">All Projects</h2>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2 mb-6 pb-6 border-b border-gray-200">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    disabled={projectsLoading}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105 ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } ${projectsLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {projectsLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                  <p className="text-gray-600">Loading projects...</p>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">
                    {selectedCategory === 'All' 
                      ? 'No projects yet' 
                      : `No projects in ${selectedCategory} category`}
                  </p>
                  <Link
                    href="/dashboard/create-post"
                    className="inline-block mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
                  >
                    Create the first project
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProjects.map((project) => {
                    const hasUpvoted = project.upvoters?.includes(user.uid) || false;
                    return (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-xl transition-all hover:scale-[1.02]"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <Link href={`/project/${project.id}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-gray-900">{project.title}</h3>
                                {project.category && (
                                  <span className="px-2 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
                                    {project.category}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </div>
                          <span className="text-sm text-gray-500 ml-4">
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Link href={`/project/${project.id}`}>
                          <p className="text-gray-700 mb-3 line-clamp-2">{project.description}</p>
                        </Link>
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {project.tags.slice(0, 5).map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleUpvote(project.id)}
                              disabled={upvoting === project.id || !user}
                              className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold transition-all hover:scale-105 ${
                                hasUpvoted
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                            >
                              ▲ {project.upvotes || 0}
                            </button>
                            <Link
                              href={`/project/${project.id}`}
                              className="flex items-center gap-1 text-gray-600 hover:text-indigo-600"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              {project.commentsCount || 0}
                            </Link>
                          </div>
                          {project.ownerId && project.ownerId !== user.uid && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCollaborate(project.ownerId, project.id)}
                                disabled={collaborating === project.id}
                                className="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-all hover:scale-105 disabled:opacity-50"
                              >
                                {collaborating === project.id ? '...' : 'Collaborate'}
                              </button>
                              <button
                                onClick={() => handleMessage(project.ownerId)}
                                className="px-3 py-1 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all hover:scale-105"
                              >
                                Message
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
                <Link
                  href="/events"
                  className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                >
                  View all →
                </Link>
              </div>
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming events</p>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-gray-900 text-sm flex-1">{event.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ml-2 ${
                          event.domain === 'Hackathon' ? 'bg-red-100 text-red-700' :
                          event.domain === 'Workshop' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {event.domain}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{event.organizer}</p>
                      <p className="text-xs text-gray-500 mb-3">
                        {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      {event.registerLink && (
                        <a
                          href={event.registerLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-105"
                        >
                          Register
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

