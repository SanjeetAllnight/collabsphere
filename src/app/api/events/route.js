import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

// Seed events data
const seedEvents = [
  {
    title: 'HackNIT Goa 2024',
    organizer: 'NIT Goa Tech Club',
    description: 'Annual 36-hour hackathon featuring innovative projects in AI, Web Dev, and IoT. Prizes worth ₹50,000.',
    domain: 'Hackathon',
    tags: ['AI/ML', 'WebDev', 'IoT'],
    location: 'NIT Goa Campus',
    startDate: new Date('2024-12-15T09:00:00'),
    endDate: new Date('2024-12-17T18:00:00'),
    availability: 'Open',
    registerLink: 'https://hacknitgoa.in/register',
  },
  {
    title: 'React Workshop Series',
    organizer: 'Web Dev Society',
    description: 'Learn React fundamentals, hooks, and state management. Hands-on sessions.',
    domain: 'Workshop',
    tags: ['WebDev', 'React'],
    location: 'Online',
    startDate: new Date('2024-11-20T14:00:00'),
    endDate: new Date('2024-11-20T17:00:00'),
    availability: 'Limited',
    registerLink: 'https://webdevsoc.in/workshops',
  },
  {
    title: 'AI/ML Seminar: Future of Tech',
    organizer: 'AI Research Lab',
    description: 'Expert talks on machine learning, deep learning, and AI applications in industry.',
    domain: 'Seminar',
    tags: ['AI/ML'],
    location: 'NIT Goa Auditorium',
    startDate: new Date('2024-11-25T10:00:00'),
    endDate: new Date('2024-11-25T13:00:00'),
    availability: 'Open',
    registerLink: 'https://ailab.nitgoa.ac.in/seminar',
  },
  {
    title: 'Blockchain Development Meetup',
    organizer: 'Blockchain Club',
    description: 'Networking and discussion on blockchain technology, smart contracts, and DeFi.',
    domain: 'Meetup',
    tags: ['Blockchain'],
    location: 'NIT Goa Library',
    startDate: new Date('2024-11-18T16:00:00'),
    endDate: new Date('2024-11-18T18:00:00'),
    availability: 'Open',
    registerLink: 'https://blockchain.nitgoa.in/meetup',
  },
  {
    title: 'Cybersecurity Workshop',
    organizer: 'Cybersec Team',
    description: 'Learn ethical hacking, penetration testing, and security best practices.',
    domain: 'Workshop',
    tags: ['Cybersec'],
    location: 'Online',
    startDate: new Date('2024-11-22T15:00:00'),
    endDate: new Date('2024-11-22T18:00:00'),
    availability: 'Limited',
    registerLink: 'https://cybersec.nitgoa.in/workshop',
  },
  {
    title: 'Mobile App Development Hackathon',
    organizer: 'AppDev Club',
    description: 'Build mobile apps using React Native or Flutter. 24-hour coding challenge.',
    domain: 'Hackathon',
    tags: ['AppDev', 'Mobile'],
    location: 'NIT Goa Campus',
    startDate: new Date('2024-12-01T09:00:00'),
    endDate: new Date('2024-12-02T18:00:00'),
    availability: 'Open',
    registerLink: 'https://appdev.nitgoa.in/hackathon',
  },
  {
    title: 'IoT Innovation Challenge',
    organizer: 'IoT Lab',
    description: 'Design and prototype IoT solutions for smart campus. Hardware provided.',
    domain: 'Hackathon',
    tags: ['IoT', 'Hardware'],
    location: 'NIT Goa IoT Lab',
    startDate: new Date('2024-11-28T10:00:00'),
    endDate: new Date('2024-11-30T17:00:00'),
    availability: 'Limited',
    registerLink: 'https://iotlab.nitgoa.in/challenge',
  },
  {
    title: 'Full Stack Development Bootcamp',
    organizer: 'Coding Club',
    description: 'Intensive 3-day bootcamp covering frontend, backend, and database design.',
    domain: 'Workshop',
    tags: ['WebDev', 'Full Stack'],
    location: 'Online',
    startDate: new Date('2024-12-05T09:00:00'),
    endDate: new Date('2024-12-07T17:00:00'),
    availability: 'Limited',
    registerLink: 'https://codingclub.nitgoa.in/bootcamp',
  },
];

/**
 * POST /api/events
 * Create a new event (or seed events if collection is empty)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Check if seeding is requested
    if (body.seed === true) {
      const eventsRef = collection(firestore, 'events');
      const existingEvents = await getDocs(eventsRef);
      
      if (existingEvents.empty) {
        // Seed events
        const seedPromises = seedEvents.map(event => {
          return addDoc(eventsRef, {
            ...event,
            startDate: Timestamp.fromDate(event.startDate),
            endDate: Timestamp.fromDate(event.endDate),
            createdAt: serverTimestamp(),
          });
        });
        
        await Promise.all(seedPromises);
        return NextResponse.json({
          success: true,
          message: `Seeded ${seedEvents.length} events`,
        });
      } else {
        return NextResponse.json({
          success: false,
          message: 'Events already exist',
        });
      }
    }

    // Create new event
    const { title, organizer, description, domain, tags, location, startDate, endDate, availability, registerLink } = body;

    if (!title || !organizer || !domain || !location || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const eventsRef = collection(firestore, 'events');
    const eventData = {
      title: title.trim(),
      organizer: organizer.trim(),
      description: description || '',
      domain,
      tags: Array.isArray(tags) ? tags : [],
      location,
      startDate: Timestamp.fromDate(new Date(startDate)),
      endDate: Timestamp.fromDate(new Date(endDate)),
      availability: availability || 'Open',
      registerLink: registerLink || '',
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(eventsRef, eventData);

    return NextResponse.json({
      success: true,
      eventId: docRef.id,
      message: 'Event created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events
 * List events with optional filters
 * Query params: domain, location, tag, from, to, availability
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domainParam = searchParams.get('domain');
    const locationParam = searchParams.get('location');
    const tagParam = searchParams.get('tag');
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const availabilityParam = searchParams.get('availability');

    const eventsRef = collection(firestore, 'events');
    let q = query(eventsRef, orderBy('startDate', 'asc'));

    // Apply filters
    if (domainParam) {
      q = query(q, where('domain', '==', domainParam));
    }
    if (locationParam) {
      q = query(q, where('location', '==', locationParam));
    }
    if (availabilityParam) {
      q = query(q, where('availability', '==', availabilityParam));
    }

    const querySnapshot = await getDocs(q);
    const events = [];
    const now = new Date();

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let include = true;

      // Filter by tag (if provided)
      if (tagParam && include) {
        const filterTag = tagParam.toLowerCase();
        const eventTags = (data.tags || []).map(t => t.toLowerCase());
        include = eventTags.includes(filterTag);
      }

      // Filter by date range (if provided)
      if (fromParam && include) {
        const fromDate = new Date(fromParam);
        const eventStartDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
        include = eventStartDate >= fromDate;
      }
      if (toParam && include) {
        const toDate = new Date(toParam);
        const eventStartDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
        include = eventStartDate <= toDate;
      }

      if (include) {
        events.push({
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate().toISOString() : (data.startDate || new Date().toISOString()),
          endDate: data.endDate?.toDate ? data.endDate.toDate().toISOString() : (data.endDate || new Date().toISOString()),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        });
      }
    });

    // Filter out past events (only show future events)
    const futureEvents = events.filter(event => {
      const startDate = new Date(event.startDate);
      return startDate >= now;
    });

    return NextResponse.json({
      success: true,
      events: futureEvents,
      count: futureEvents.length,
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

