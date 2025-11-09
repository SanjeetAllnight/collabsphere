import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';

export async function ensureSeedData() {
  await Promise.all([
    seedEventsIfEmpty(),
    seedProjectsIfEmpty(),
    seedActivitiesIfEmpty(),
  ]);
}

export async function seedEventsIfEmpty() {
  const ref = collection(firestore, 'events');
  const snap = await getDocs(ref);
  if (!snap.empty) return;
  const now = new Date();
  const todayAt10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
  const in2Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 17, 0, 0);
  const in5Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 9, 30, 0);
  const samples = [
    {
      title: 'Campus Tech Meetup',
      description: 'Networking and lightning talks on modern web dev.',
      eventDate: todayAt10,
      category: 'technical',
      location: 'Auditorium A',
      registrationLink: '#',
      createdBy: 'seed',
      banner: '',
    },
    {
      title: 'Inter-College Hackathon',
      description: '48-hour hackathon. Form teams and build!',
      eventDate: in2Days,
      category: 'technical',
      location: 'Innovation Lab',
      registrationLink: '#',
      createdBy: 'seed',
      banner: '',
    },
    {
      title: 'Cultural Night Fest',
      description: 'Music, dance and performances by student clubs.',
      eventDate: in5Days,
      category: 'cultural',
      location: 'Main Ground',
      registrationLink: '#',
      createdBy: 'seed',
      banner: '',
    },
  ];
  for (const e of samples) {
    await addDoc(ref, { ...e, createdAt: serverTimestamp() });
  }
}

export async function seedProjectsIfEmpty() {
  const ref = collection(firestore, 'projects');
  const snap = await getDocs(ref);
  if (!snap.empty) return;
  const samples = [
    {
      ownerId: 'seed-user',
      ownerEmail: 'seed@example.com',
      title: 'AI Study Buddy',
      description: 'AI chatbot to help students study with spaced repetition.',
      category: 'AI/ML',
      tags: ['ai', 'chatbot', 'education'],
      requiredSkills: ['Python', 'React', 'Firebase'],
      contributors: [],
      upvotes: 0,
      upvoters: [],
      commentsCount: 0,
    },
    {
      ownerId: 'seed-user',
      ownerEmail: 'seed@example.com',
      title: 'Campus Connect App',
      description: 'A mobile app to connect clubs and events on campus.',
      category: 'AppDev',
      tags: ['react-native', 'supabase', 'push'],
      requiredSkills: ['React Native', 'Design'],
      contributors: [],
      upvotes: 0,
      upvoters: [],
      commentsCount: 0,
    },
  ];
  for (const p of samples) {
    await addDoc(ref, { ...p, createdAt: serverTimestamp() });
  }
}

export async function seedActivitiesIfEmpty() {
  const ref = collection(firestore, 'activities');
  const snap = await getDocs(ref);
  if (!snap.empty) return;
  const samples = [
    { userId: 'seed-user', type: 'created_project', payload: { projectTitle: 'AI Study Buddy' } },
    { userId: 'seed-user', type: 'upvoted', payload: {} },
  ];
  for (const a of samples) {
    await addDoc(ref, { ...a, createdAt: serverTimestamp() });
  }
}
