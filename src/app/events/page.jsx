'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getCurrentUser, onAuthChange } from '@/lib/auth';

export default function EventsPage() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    domain: [],
    location: '',
    from: '',
    to: '',
    availability: '',
    tag: '',
  });

  useEffect(() => {
    const unsubscribe = onAuthChange((currentUser) => {
      setUser(currentUser);
    });
    setUser(getCurrentUser());
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchEvents();
    // Seed events on first load if empty
    seedEventsIfNeeded();
  }, [filters]);

  const seedEventsIfNeeded = async () => {
    try {
      const response = await fetch('/api/events?limit=1');
      const data = await response.json();
      if (data.success && data.events.length === 0) {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seed: true }),
        });
        fetchEvents();
      }
    } catch (err) {
      console.error('Error seeding events:', err);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.domain.length > 0) {
        filters.domain.forEach(d => params.append('domain', d));
      }
      if (filters.location) params.append('location', filters.location);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.availability) params.append('availability', filters.availability);
      if (filters.tag) params.append('tag', filters.tag);

      const response = await fetch(`/api/events?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDomain = (domain) => {
    setFilters(prev => ({
      ...prev,
      domain: prev.domain.includes(domain)
        ? prev.domain.filter(d => d !== domain)
        : [...prev.domain, domain],
    }));
  };

  const domains = ['Hackathon', 'Workshop', 'Seminar', 'Meetup'];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Student Events</h1>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6 mb-6"
        >
          <h2 className="text-lg font-bold text-gray-800 mb-4">Filters</h2>
          
          {/* Domain Multi-select */}
          <div className="mb-4">
            <label className="block text-sm font-bold text-gray-800 mb-2">Domain</label>
            <div className="flex flex-wrap gap-2">
              {domains.map(domain => (
                <button
                  key={domain}
                  onClick={() => toggleDomain(domain)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    filters.domain.includes(domain)
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Location</label>
              <input
                type="text"
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                placeholder="Online, City..."
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">From Date</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">To Date</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">Availability</label>
              <select
                value={filters.availability}
                onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
              >
                <option value="">All</option>
                <option value="Open">Open</option>
                <option value="Limited">Limited</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-800 mb-2">Tag</label>
            <input
              type="text"
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
              placeholder="AI/ML, WebDev..."
              className="w-full border border-gray-300 rounded-lg p-2 text-gray-900 font-semibold focus:ring-purple-500 focus:ring-2 focus:border-transparent outline-none transition"
            />
          </div>
        </motion.div>

        {/* Events Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <p className="text-gray-500 text-lg">No events match your filters. Try changing filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all hover:scale-105"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900 flex-1">{event.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    event.domain === 'Hackathon' ? 'bg-red-100 text-red-700' :
                    event.domain === 'Workshop' ? 'bg-blue-100 text-blue-700' :
                    event.domain === 'Seminar' ? 'bg-green-100 text-green-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {event.domain}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">by {event.organizer}</p>
                {event.description && (
                  <p className="text-gray-700 text-sm mb-4 line-clamp-2">{event.description}</p>
                )}
                {event.tags && event.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {event.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-2 mb-4 text-sm">
                  <p className="text-gray-600">📍 {event.location}</p>
                  <p className="text-gray-600">📅 {formatDate(event.startDate)} - {formatDate(event.endDate)}</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    event.availability === 'Open' ? 'bg-green-100 text-green-700' :
                    event.availability === 'Limited' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {event.availability}
                  </span>
                </div>
                {event.registerLink && (
                  <a
                    href={event.registerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-105"
                  >
                    Register
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

