'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/lib/auth';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [branch, setBranch] = useState('');
  const [techSkills, setTechSkills] = useState('');
  const [nonTechSkills, setNonTechSkills] = useState('');
  const [personalityStyle, setPersonalityStyle] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!name || name.trim() === '') {
      setError('Name is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { user, error: authError } = await register(email, password, name);

      if (authError) {
        // Format Firebase error messages for better UX
        let errorMessage = authError;
        if (authError.includes('email-already-in-use')) {
          errorMessage = 'An account with this email already exists. Please login instead.';
        } else if (authError.includes('invalid-email')) {
          errorMessage = 'Invalid email address.';
        } else if (authError.includes('weak-password')) {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        }
        setError(errorMessage);
      } else if (user) {
        // Save additional profile fields to Firestore
        const techSkillsArray = techSkills.trim() 
          ? techSkills.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
          : [];
        const nonTechSkillsArray = nonTechSkills.trim() 
          ? nonTechSkills.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
          : [];

        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.uid,
              userData: {
                college: college.trim() || '',
                branch: branch.trim() || '',
                techSkills: techSkillsArray,
                nonTechSkills: nonTechSkillsArray,
                personalityStyle: personalityStyle || '',
                github: github.trim() || '',
                linkedin: linkedin.trim() || '',
                portfolio: portfolio.trim() || '',
              },
            }),
          });

          if (!response.ok) {
            console.error('Failed to save profile data');
          }
        } catch (profileError) {
          console.error('Error saving profile:', profileError);
        }

        router.push('/dashboard');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CollabSphere</h1>
          <p className="text-gray-600 mt-2">Campus Collaboration Platform</p>
          <h2 className="text-2xl font-semibold text-gray-800 mt-6">Register</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-base font-bold text-gray-800 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-base font-bold text-gray-800 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-bold text-gray-800 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              placeholder="Enter your password"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="college" className="block text-base font-bold text-gray-800 mb-2">
                College
              </label>
              <input
                id="college"
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
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
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                placeholder="e.g., CSE, ECE"
              />
            </div>
          </div>

          <div>
            <label htmlFor="techSkills" className="block text-base font-bold text-gray-800 mb-2">
              Technical Skills
            </label>
            <input
              id="techSkills"
              type="text"
              value={techSkills}
              onChange={(e) => setTechSkills(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
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
              value={nonTechSkills}
              onChange={(e) => setNonTechSkills(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              placeholder="Public Speaking, Design (comma-separated)"
            />
            <p className="mt-1 text-xs text-gray-500">Separate multiple skills with commas</p>
          </div>


          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="github" className="block text-base font-bold text-gray-800 mb-2">
                GitHub
              </label>
              <input
                id="github"
                type="text"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
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
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
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
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-black font-bold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
                placeholder="yourportfolio.com"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

