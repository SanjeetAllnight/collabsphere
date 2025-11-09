import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { getAllPosts } from '@/lib/db';
import Link from 'next/link';

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function fetchEventsFromFirestore() {
  try {
    const ref = collection(firestore, 'events');
    const q = query(ref, orderBy('startDate', 'asc'));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => {
      const data = d.data();
      const startDate = data.startDate?.toDate
        ? data.startDate.toDate()
        : data.eventDate?.toDate
        ? data.eventDate.toDate()
        : data.startDate
        ? new Date(data.startDate)
        : data.eventDate
        ? new Date(data.eventDate)
        : null;
      return {
        id: d.id,
        title: data.title || 'Untitled Event',
        description: data.description || '',
        startDate,
        category: data.category || 'other',
        createdBy: data.createdBy || '',
        banner: data.banner || '',
        location: data.location || '',
      };
    });
    return items;
  } catch {
    return [];
  }
}

function getSampleEvents() {
  const now = new Date();
  const todayAt10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const in2Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 17, 0, 0);
  const in5Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 9, 30, 0);
  return [
    {
      id: 'sample-today-1',
      title: 'Campus Tech Meetup',
      description: 'Networking and lightning talks on modern web dev.',
      eventDate: todayAt10,
      category: 'technical',
      createdBy: 'system',
      banner: '',
    },
    {
      id: 'sample-upcoming-1',
      title: 'Inter-College Hackathon',
      description: '48-hour hackathon. Form teams and build!',
      eventDate: in2Days,
      category: 'technical',
      createdBy: 'system',
      banner: '',
    },
    {
      id: 'sample-upcoming-2',
      title: 'Cultural Night Fest',
      description: 'Music, dance and performances by student clubs.',
      eventDate: in5Days,
      category: 'cultural',
      createdBy: 'system',
      banner: '',
    },
  ];
}

export default async function EventsPage({ searchParams }) {
  const [events, postsResult] = await Promise.all([
    fetchEventsFromFirestore(),
    getAllPosts().catch(() => ({ success: false, posts: [] })),
  ]);

  const data = events && events.length > 0 ? events : getSampleEvents();

  const now = new Date();
  // Filters via searchParams
  const domain = searchParams?.domain;
  const from = searchParams?.from ? new Date(searchParams.from) : null;
  const to = searchParams?.to ? new Date(searchParams.to) : null;

  const filtered = data.filter((e) => {
    if (domain && e.category !== domain) return false;
    if (from && e.startDate && e.startDate < from) return false;
    if (to && e.startDate && e.startDate > to) return false;
    return true;
  });

  const current = filtered.filter((e) => e.startDate && isSameDay(e.startDate, now));
  const upcoming = filtered
    .filter((e) => e.startDate && e.startDate > now && !isSameDay(e.startDate, now))
    .sort((a, b) => a.startDate - b.startDate);

  const featuredPosts = (postsResult?.posts || []).slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 py-10 px-4">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Explore Events</h1>
            <p className="mt-2 text-gray-600">Discover what’s happening on campus and beyond.</p>
          </div>
        </div>

        {/* Filters */}
        <form action="/events" method="get" className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Domain</label>
              <select name="domain" defaultValue={domain || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                <option value="">All</option>
                <option value="technical">Technical</option>
                <option value="cultural">Cultural</option>
                <option value="sports">Sports</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">From</label>
              <input type="date" name="from" defaultValue={searchParams?.from || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
              <input type="date" name="to" defaultValue={searchParams?.to || ''} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <button className="w-full md:w-auto px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Apply</button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Upcoming Events</h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-gray-500">No upcoming events.</p>
            ) : (
              <ul className="space-y-4">
                {upcoming.map((e) => (
                  <li key={e.id} className="group rounded-xl border border-gray-100 bg-white/60 p-5 hover:shadow-md transition">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 rounded-lg bg-indigo-600/10 text-indigo-700 px-3 py-2 text-sm font-semibold">
                        {formatDate(e.startDate)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{e.title}</h3>
                        {e.description && (
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{e.description}</p>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 capitalize">
                            {e.category}
                          </span>
                          <Link href={`/events/${e.id}`} className="ml-auto text-sm font-medium text-indigo-700 hover:text-indigo-800">View Details →</Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Current / Live Events</h2>
            </div>
            {current.length === 0 ? (
              <p className="text-gray-500">No events happening today.</p>
            ) : (
              <ul className="space-y-4">
                {current.map((e) => (
                  <li key={e.id} className="group rounded-xl border border-gray-100 bg-white/60 p-5 hover:shadow-md transition">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 rounded-lg bg-emerald-600/10 text-emerald-700 px-3 py-2 text-sm font-semibold">
                        {formatDate(e.startDate)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{e.title}</h3>
                        {e.description && (
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{e.description}</p>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 capitalize">
                            {e.category}
                          </span>
                          <Link href={`/events/${e.id}`} className="ml-auto text-sm font-medium text-indigo-700 hover:text-indigo-800">View Details →</Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Featured Projects</h2>
            <a href="/dashboard" className="text-sm font-medium text-indigo-700 hover:text-indigo-800">View all</a>
          </div>
          {featuredPosts.length === 0 ? (
            <p className="text-gray-500">No featured projects yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredPosts.map((p) => (
                <div key={p.id} className="rounded-2xl border border-gray-100 bg-white/70 p-5 hover:shadow-md transition">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{p.title}</h3>
                  {p.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{p.description}</p>
                  )}
                  <div className="mt-4">
                    <a href={`/dashboard`} className="inline-flex items-center text-sm font-medium text-indigo-700 hover:text-indigo-800">View Details →</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

