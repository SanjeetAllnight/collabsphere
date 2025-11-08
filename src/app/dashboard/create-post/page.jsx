'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, onAuthChange } from '@/lib/auth';

export default function CreatePostPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  const categories = ['WebDev', 'AI/ML', 'IoT', 'AppDev', 'Cybersec', 'Blockchain', 'Others'];

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthChange((currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setAuthLoading(false);
    });

    // Check initial auth state
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);
    setAuthLoading(false);

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    if (!category) {
      setError('Category is required');
      return;
    }

    if (!user) {
      setError('You must be logged in to create a post');
      return;
    }

    setLoading(true);

    try {
      // Convert tags and requiredSkills to arrays
      const tagsArray = tags.trim() 
        ? tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
        : [];
      const requiredSkillsArray = requiredSkills.trim() 
        ? requiredSkills.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
        : [];

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerId: user.uid,
          ownerEmail: user.email,
          title: title.trim(),
          description: description.trim(),
          category,
          tags: tagsArray,
          requiredSkills: requiredSkillsArray,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  // Only render if user is logged in
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Post</h1>
          <p className="text-gray-600">Share your ideas with the campus community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-base font-bold text-gray-800 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              placeholder="Enter project title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-base font-bold text-gray-800 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={6}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition resize-none"
              placeholder="Enter project description"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-base font-bold text-gray-800 mb-2">
              Category/Domain <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tags" className="block text-base font-bold text-gray-800 mb-2">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              placeholder="AI, Machine Learning, Python (comma-separated)"
            />
            <p className="mt-1 text-xs text-gray-500">Separate multiple tags with commas</p>
          </div>

          <div>
            <label htmlFor="requiredSkills" className="block text-base font-bold text-gray-800 mb-2">
              Required Skills
            </label>
            <input
              id="requiredSkills"
              type="text"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              placeholder="React, Node.js, MongoDB (comma-separated)"
            />
            <p className="mt-1 text-xs text-gray-500">Separate multiple skills with commas</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

