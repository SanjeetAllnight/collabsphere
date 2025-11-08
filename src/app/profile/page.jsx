'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { getUserById, updateUserProfile, getPostsByOwner, deletePost, uploadProfileImage } from '@/lib/db';
import UserStatus from '@/components/UserStatus';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    college: '',
    branch: '',
    year: '',
    degree: '',
    techSkills: '',
    nonTechSkills: '',
    interests: '',
    preferredRole: '',
    experienceLevel: '',
    availability: '',
    personalityStyle: '',
    github: '',
    linkedin: '',
    portfolio: '',
    recentProjects: [],
    achievements: [],
  });

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
    const fetchUserProfile = async () => {
      if (!loading && user) {
        setProfileLoading(true);
        const { success, user: profile, error: profileError } = await getUserById(user.uid);

        if (success && profile) {
          setUserProfile(profile);
          // Convert arrays to comma-separated strings for form inputs
          const techSkillsString = Array.isArray(profile.techSkills) 
            ? profile.techSkills.join(', ') 
            : (Array.isArray(profile.skills) ? profile.skills.join(', ') : (profile.skills || ''));
          const nonTechSkillsString = Array.isArray(profile.nonTechSkills) 
            ? profile.nonTechSkills.join(', ') 
            : '';
          const interestsString = Array.isArray(profile.interests) 
            ? profile.interests.join(', ') 
            : (profile.interests || '');
          setFormData({
            name: profile.name || '',
            college: profile.college || '',
            branch: profile.branch || '',
            year: profile.year || '',
            degree: profile.degree || '',
            techSkills: techSkillsString,
            nonTechSkills: nonTechSkillsString,
            interests: interestsString,
            preferredRole: profile.preferredRole || '',
            experienceLevel: profile.experienceLevel || '',
            availability: profile.availability || '',
            personalityStyle: profile.personalityStyle || '',
            github: profile.github || '',
            linkedin: profile.linkedin || '',
            portfolio: profile.portfolio || '',
            recentProjects: Array.isArray(profile.recentProjects) ? profile.recentProjects : [],
            achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
          });
        } else {
          setError(profileError || 'Failed to load profile');
        }
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [loading, user]);

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!loading && user) {
        setPostsLoading(true);
        const { success, posts, error: postsError } = await getPostsByOwner(user.uid);

        if (success) {
          setUserPosts(posts);
        } else {
          setError(postsError || 'Failed to load posts');
        }
        setPostsLoading(false);
      }
    };

    fetchUserPosts();
  }, [loading, user]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (userProfile) {
      const techSkillsString = Array.isArray(userProfile.techSkills) 
        ? userProfile.techSkills.join(', ') 
        : (Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : (userProfile.skills || ''));
      const nonTechSkillsString = Array.isArray(userProfile.nonTechSkills) 
        ? userProfile.nonTechSkills.join(', ') 
        : '';
      const interestsString = Array.isArray(userProfile.interests) 
        ? userProfile.interests.join(', ') 
        : (userProfile.interests || '');
      setFormData({
        name: userProfile.name || '',
        college: userProfile.college || '',
        branch: userProfile.branch || '',
        year: userProfile.year || '',
        degree: userProfile.degree || '',
        techSkills: techSkillsString,
        nonTechSkills: nonTechSkillsString,
        interests: interestsString,
        preferredRole: userProfile.preferredRole || '',
        experienceLevel: userProfile.experienceLevel || '',
        availability: userProfile.availability || '',
        personalityStyle: userProfile.personalityStyle || '',
        github: userProfile.github || '',
        linkedin: userProfile.linkedin || '',
        portfolio: userProfile.portfolio || '',
        recentProjects: Array.isArray(userProfile.recentProjects) ? userProfile.recentProjects : [],
        achievements: Array.isArray(userProfile.achievements) ? userProfile.achievements : [],
      });
    }
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Convert comma-separated strings to arrays
      const techSkillsArray = formData.techSkills.trim() 
        ? formData.techSkills.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
        : [];
      const nonTechSkillsArray = formData.nonTechSkills.trim() 
        ? formData.nonTechSkills.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
        : [];
      const interestsArray = formData.interests.trim() 
        ? formData.interests.split(',').map((i) => i.trim()).filter((i) => i.length > 0)
        : [];

      const { success, error: updateError } = await updateUserProfile(user.uid, {
        name: formData.name.trim(),
        college: formData.college.trim() || '',
        branch: formData.branch.trim() || '',
        year: formData.year.trim() || '',
        degree: formData.degree.trim() || '',
        techSkills: techSkillsArray,
        nonTechSkills: nonTechSkillsArray,
        interests: interestsArray,
        preferredRole: formData.preferredRole.trim() || '',
        experienceLevel: formData.experienceLevel || '',
        availability: formData.availability || '',
        personalityStyle: formData.personalityStyle || '',
        github: formData.github.trim() || '',
        linkedin: formData.linkedin.trim() || '',
        portfolio: formData.portfolio.trim() || '',
        recentProjects: formData.recentProjects || [],
        achievements: formData.achievements || [],
      });

      if (success) {
        // Refresh profile data without page reload
        const { success: refreshSuccess, user: updatedProfile } = await getUserById(user.uid);
        if (refreshSuccess && updatedProfile) {
          setUserProfile(updatedProfile);
          // Update form data with new values
          const techSkillsString = Array.isArray(updatedProfile.techSkills) 
            ? updatedProfile.techSkills.join(', ') 
            : (Array.isArray(updatedProfile.skills) ? updatedProfile.skills.join(', ') : (updatedProfile.skills || ''));
          const nonTechSkillsString = Array.isArray(updatedProfile.nonTechSkills) 
            ? updatedProfile.nonTechSkills.join(', ') 
            : '';
          const interestsString = Array.isArray(updatedProfile.interests) 
            ? updatedProfile.interests.join(', ') 
            : (updatedProfile.interests || '');
          setFormData({
            name: updatedProfile.name || '',
            college: updatedProfile.college || '',
            branch: updatedProfile.branch || '',
            year: updatedProfile.year || '',
            degree: updatedProfile.degree || '',
            techSkills: techSkillsString,
            nonTechSkills: nonTechSkillsString,
            interests: interestsString,
            preferredRole: updatedProfile.preferredRole || '',
            experienceLevel: updatedProfile.experienceLevel || '',
            availability: updatedProfile.availability || '',
            personalityStyle: updatedProfile.personalityStyle || '',
            github: updatedProfile.github || '',
            linkedin: updatedProfile.linkedin || '',
            portfolio: updatedProfile.portfolio || '',
            recentProjects: Array.isArray(updatedProfile.recentProjects) ? updatedProfile.recentProjects : [],
            achievements: Array.isArray(updatedProfile.achievements) ? updatedProfile.achievements : [],
          });
        }
        setIsEditing(false);
      } else {
        setError(updateError || 'Failed to update profile');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError('');

    try {
      // Upload image to Firebase Storage
      const { success, imageUrl, error: uploadError } = await uploadProfileImage(user.uid, file);

      if (success && imageUrl) {
        // Save image URL to Firestore
        const { success: updateSuccess, error: updateError } = await updateUserProfile(user.uid, {
          profileImageUrl: imageUrl,
        });

        if (updateSuccess) {
          // Refresh profile data
          const { success: refreshSuccess, user: updatedProfile } = await getUserById(user.uid);
          if (refreshSuccess && updatedProfile) {
            setUserProfile(updatedProfile);
          }
        } else {
          setError(updateError || 'Failed to save image URL');
        }
      } else {
        setError(uploadError || 'Failed to upload image');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setDeleting(postId);
    setError('');

    try {
      const { success, error: deleteError } = await deletePost(postId);

      if (success) {
        // Remove post from local state
        setUserPosts(userPosts.filter(post => post.id !== postId));
      } else {
        setError(deleteError || 'Failed to delete post');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  // Show loading state while checking authentication
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  // Only render if user is logged in
  if (!user || !userProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex flex-col items-center mb-6">
            {/* Avatar with Image or Initials */}
            <div className="relative mb-4">
              {userProfile.profileImageUrl ? (
                <img
                  src={userProfile.profileImageUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-600"
                />
              ) : (
                <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-indigo-600">
                  {getInitials(userProfile.name || user.email)}
                </div>
              )}
              {/* Upload Button Overlay */}
              <label className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-2 cursor-pointer hover:bg-indigo-700 transition shadow-lg">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </label>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {userProfile.name || 'User'}
            </h1>
            <p className="text-gray-600 mb-2">{user.email}</p>
            <UserStatus userId={user?.uid || null} />

            {/* Profile Information */}
            <div className="w-full space-y-6">
              {/* About Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3">About</h3>
                <div className="grid grid-cols-2 gap-4">
                  {userProfile.college && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
                      <p className="text-gray-900 font-semibold">{userProfile.college}</p>
                    </div>
                  )}
                  {userProfile.branch && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <p className="text-gray-900 font-semibold">{userProfile.branch}</p>
                    </div>
                  )}
                  {userProfile.year && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                      <p className="text-gray-900 font-semibold">{userProfile.year}</p>
                    </div>
                  )}
                  {userProfile.degree && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
                      <p className="text-gray-900 font-semibold">{userProfile.degree}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Skills</h3>
                {(userProfile.techSkills && Array.isArray(userProfile.techSkills) && userProfile.techSkills.length > 0) && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Technical Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.techSkills.map((skill, index) => (
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
                {(userProfile.nonTechSkills && Array.isArray(userProfile.nonTechSkills) && userProfile.nonTechSkills.length > 0) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Non-Technical Skills</label>
                    <div className="flex flex-wrap gap-2">
                      {userProfile.nonTechSkills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(!userProfile.techSkills || (Array.isArray(userProfile.techSkills) && userProfile.techSkills.length === 0)) && 
                 (!userProfile.nonTechSkills || (Array.isArray(userProfile.nonTechSkills) && userProfile.nonTechSkills.length === 0)) && (
                  <p className="text-gray-500">No skills added yet</p>
                )}
              </div>

              {/* Interests Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3">Interests</h3>
                {userProfile.interests && (Array.isArray(userProfile.interests) ? userProfile.interests.length > 0 : userProfile.interests) ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(userProfile.interests) ? (
                      userProfile.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                        >
                          {interest}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                        {userProfile.interests}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No interests added yet</p>
                )}
              </div>

              {/* Links Section */}
              {(userProfile.github || userProfile.linkedin || userProfile.portfolio) && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Links</h3>
                  <div className="flex flex-wrap gap-3">
                    {userProfile.github && (
                      <a
                        href={userProfile.github.startsWith('http') ? userProfile.github : `https://${userProfile.github}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        GitHub
                      </a>
                    )}
                    {userProfile.linkedin && (
                      <a
                        href={userProfile.linkedin.startsWith('http') ? userProfile.linkedin : `https://${userProfile.linkedin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    {userProfile.portfolio && (
                      <a
                        href={userProfile.portfolio.startsWith('http') ? userProfile.portfolio : `https://${userProfile.portfolio}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        Portfolio
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Recent Projects Section */}
              {userProfile.recentProjects && Array.isArray(userProfile.recentProjects) && userProfile.recentProjects.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Recent Projects</h3>
                  <div className="space-y-3">
                    {userProfile.recentProjects.map((project, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{project.title}</h4>
                            {project.description && (
                              <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                            )}
                          </div>
                          {project.link && (
                            <a
                              href={project.link.startsWith('http') ? project.link : `https://${project.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 text-indigo-600 hover:text-indigo-700"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements Section */}
              {userProfile.achievements && Array.isArray(userProfile.achievements) && userProfile.achievements.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Achievements</h3>
                  <div className="space-y-3">
                    {userProfile.achievements.map((achievement, index) => (
                      <div key={index} className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                            {achievement.description && (
                              <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                            )}
                          </div>
                          {achievement.link && (
                            <a
                              href={achievement.link.startsWith('http') ? achievement.link : `https://${achievement.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 text-indigo-600 hover:text-indigo-700"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              {(userProfile.preferredRole || userProfile.experienceLevel || userProfile.availability || userProfile.personalityStyle) && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Additional Info</h3>
                  <div className="space-y-2">
                    {userProfile.preferredRole && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Role</label>
                        <p className="text-gray-900 font-semibold">{userProfile.preferredRole}</p>
                      </div>
                    )}
                    {userProfile.experienceLevel && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                        <p className="text-gray-900 font-semibold">{userProfile.experienceLevel}</p>
                      </div>
                    )}
                    {userProfile.availability && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                        <p className="text-gray-900 font-semibold">{userProfile.availability}</p>
                      </div>
                    )}
                    {userProfile.personalityStyle && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Personality Style</label>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                          {userProfile.personalityStyle}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Edit Profile Button */}
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="mt-6 w-full bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Profile</h2>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Basic Info */}
                <div>
                  <label htmlFor="name" className="block text-base font-bold text-gray-800 mb-2">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                    placeholder="Enter your name"
                  />
                </div>

                {/* About Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="college" className="block text-base font-bold text-gray-800 mb-2">
                      College
                    </label>
                    <input
                      id="college"
                      type="text"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                      placeholder="Your college name"
                    />
                  </div>
                  <div>
                    <label htmlFor="branch" className="block text-base font-bold text-gray-800 mb-2">
                      Branch
                    </label>
                    <input
                      id="branch"
                      type="text"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                      placeholder="e.g., CSE, ECE"
                    />
                  </div>
                  <div>
                    <label htmlFor="year" className="block text-base font-bold text-gray-800 mb-2">
                      Year
                    </label>
                    <input
                      id="year"
                      type="text"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                      placeholder="e.g., 2nd Year"
                    />
                  </div>
                  <div>
                    <label htmlFor="degree" className="block text-base font-bold text-gray-800 mb-2">
                      Degree
                    </label>
                    <input
                      id="degree"
                      type="text"
                      value={formData.degree}
                      onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                      placeholder="e.g., B.Tech, BSc"
                    />
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label htmlFor="techSkills" className="block text-base font-bold text-gray-800 mb-2">
                    Technical Skills
                  </label>
                  <input
                    id="techSkills"
                    type="text"
                    value={formData.techSkills}
                    onChange={(e) => setFormData({ ...formData, techSkills: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                    placeholder="React, Node.js, SQL (comma-separated)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate multiple skills with commas</p>
                </div>

                <div>
                  <label htmlFor="nonTechSkills" className="block text-base font-bold text-gray-800 mb-2">
                    Non-Technical Skills
                  </label>
                  <input
                    id="nonTechSkills"
                    type="text"
                    value={formData.nonTechSkills}
                    onChange={(e) => setFormData({ ...formData, nonTechSkills: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                    placeholder="Public Speaking, Design (comma-separated)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate multiple skills with commas</p>
                </div>

                <div>
                  <label htmlFor="interests" className="block text-base font-bold text-gray-800 mb-2">
                    Interests
                  </label>
                  <input
                    id="interests"
                    type="text"
                    value={formData.interests}
                    onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                    placeholder="AI/ML, WebDev, Finance (comma-separated)"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate multiple interests with commas</p>
                </div>

                {/* Links */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="github" className="block text-base font-bold text-gray-800 mb-2">
                      GitHub
                    </label>
                    <input
                      id="github"
                      type="text"
                      value={formData.github}
                      onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                      placeholder="github.com/username"
                    />
                  </div>
                  <div>
                    <label htmlFor="linkedin" className="block text-base font-bold text-gray-800 mb-2">
                      LinkedIn
                    </label>
                    <input
                      id="linkedin"
                      type="text"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label htmlFor="portfolio" className="block text-base font-bold text-gray-800 mb-2">
                      Portfolio
                    </label>
                    <input
                      id="portfolio"
                      type="text"
                      value={formData.portfolio}
                      onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                      placeholder="yourportfolio.com"
                    />
                  </div>
                </div>

                {/* Additional Fields */}
                <div>
                  <label htmlFor="preferredRole" className="block text-base font-bold text-gray-800 mb-2">
                    Preferred Role
                  </label>
                  <input
                    id="preferredRole"
                    type="text"
                    value={formData.preferredRole}
                    onChange={(e) => setFormData({ ...formData, preferredRole: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                    placeholder="e.g., Frontend Developer, Full Stack Developer"
                  />
                </div>

                <div>
                  <label htmlFor="experienceLevel" className="block text-base font-bold text-gray-800 mb-2">
                    Experience Level
                  </label>
                  <select
                    id="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                  >
                    <option value="">Select experience level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="availability" className="block text-base font-bold text-gray-800 mb-2">
                    Availability
                  </label>
                  <select
                    id="availability"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                  >
                    <option value="">Select availability</option>
                    <option value="5-10 hr/week">5-10 hr/week</option>
                    <option value="10-20 hr/week">10-20 hr/week</option>
                    <option value="20+ hr/week">20+ hr/week</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="personalityStyle" className="block text-base font-bold text-gray-800 mb-2">
                    Personality Style
                  </label>
                  <select
                    id="personalityStyle"
                    value={formData.personalityStyle}
                    onChange={(e) => setFormData({ ...formData, personalityStyle: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                  >
                    <option value="">Select personality style</option>
                    <option value="Analytical">Analytical</option>
                    <option value="Creative">Creative</option>
                    <option value="Structured">Structured</option>
                    <option value="Flexible">Flexible</option>
                  </select>
                </div>

                <p className="text-sm text-gray-600 italic">
                  Note: Recent Projects and Achievements can be added later through the API or admin panel.
                </p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* My Posts Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">My Posts</h2>

          {postsLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading posts...</p>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">You haven't created any posts yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userPosts.map((post) => (
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
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deleting === post.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      title="Delete post"
                    >
                      {deleting === post.id ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
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

