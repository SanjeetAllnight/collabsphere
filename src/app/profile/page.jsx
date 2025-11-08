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
    skills: '',
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
          // Convert skills array to comma-separated string for form input
          const skillsString = Array.isArray(profile.skills) 
            ? profile.skills.join(', ') 
            : (profile.skills || '');
          setFormData({
            name: profile.name || '',
            skills: skillsString,
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
      // Convert skills array to comma-separated string for form input
      const skillsString = Array.isArray(userProfile.skills) 
        ? userProfile.skills.join(', ') 
        : (userProfile.skills || '');
      setFormData({
        name: userProfile.name || '',
        skills: skillsString,
      });
    }
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // Convert skills string to array: split by comma and trim each item
      const skillsArray = formData.skills.trim() 
        ? formData.skills.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
        : [];

      const { success, error: updateError } = await updateUserProfile(user.uid, {
        name: formData.name.trim(),
        skills: skillsArray,
      });

      if (success) {
        // Refresh profile data without page reload
        const { success: refreshSuccess, user: updatedProfile } = await getUserById(user.uid);
        if (refreshSuccess && updatedProfile) {
          setUserProfile(updatedProfile);
          // Update form data with new values
          const skillsString = Array.isArray(updatedProfile.skills) 
            ? updatedProfile.skills.join(', ') 
            : (updatedProfile.skills || '');
          setFormData({
            name: updatedProfile.name || '',
            skills: skillsString,
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
            <div className="w-full space-y-4">
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{userProfile.name || 'Not set'}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
                {userProfile.skills && (Array.isArray(userProfile.skills) ? userProfile.skills.length > 0 : userProfile.skills) ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(userProfile.skills) ? (
                      userProfile.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                        {userProfile.skills}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">No skills added yet</p>
                )}
              </div>
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
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-2">
                    Skills
                  </label>
                  <input
                    id="skills"
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                    placeholder="Enter skills separated by commas (e.g., JavaScript, React, Node.js)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate multiple skills with commas
                  </p>
                </div>

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
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
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

