/**
 * Firestore Seed Script
 * Populates the database with realistic demo data for demo and judging
 * 
 * Run with: npm run seed
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// Firebase configuration (same as in src/lib/firebase.js)
const firebaseConfig = {
  apiKey: "AIzaSyBdNpjXs_g9gCub835Ve4bOcy8zBCgVXeU",
  authDomain: "collabsphere-9fb78.firebaseapp.com",
  projectId: "collabsphere-9fb78",
  storageBucket: "collabsphere-9fb78.firebasestorage.app",
  messagingSenderId: "587627144926",
  appId: "1:587627144926:web:4e5cebb3257dca4791c44f",
};

// Initialize Firebase for Node.js environment
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to get initials from name
function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase();
}

/**
 * Seed Users
 */
async function seedUsers() {
  console.log('🌱 Seeding users...');
  
  const users = [
    {
      name: 'Aarav Patel',
      email: 'aarav.patel@student.nitgoa.ac.in',
      techSkills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'UI/UX'],
      nonTechSkills: ['Public Speaking', 'Project Management'],
      interests: ['Web Development', 'UI/UX Design', 'Startups'],
      preferredRole: 'Full Stack Developer',
      personalityStyle: 'Creative',
      experienceLevel: 'Intermediate',
      availability: '10-20 hr/week',
      college: 'NIT Goa',
      branch: 'Computer Science',
      year: '3rd Year',
      degree: 'B.Tech',
      github: 'github.com/aaravpatel',
      linkedin: 'linkedin.com/in/aaravpatel',
      portfolio: 'aaravpatel.dev',
    },
    {
      name: 'Ishita Sharma',
      email: 'ishita.sharma@student.nitgoa.ac.in',
      techSkills: ['Python', 'TensorFlow', 'PyTorch', 'Scikit-learn', 'Data Analysis'],
      nonTechSkills: ['Research', 'Technical Writing'],
      interests: ['AI/ML', 'Data Science', 'Research'],
      preferredRole: 'ML Engineer',
      personalityStyle: 'Analytical',
      experienceLevel: 'Advanced',
      availability: '15-20 hr/week',
      college: 'NIT Goa',
      branch: 'Computer Science',
      year: '4th Year',
      degree: 'B.Tech',
      github: 'github.com/ishitasharma',
      linkedin: 'linkedin.com/in/ishitasharma',
    },
    {
      name: 'Rohan Desai',
      email: 'rohan.desai@student.nitgoa.ac.in',
      techSkills: ['Java', 'Spring Boot', 'PostgreSQL', 'Docker', 'Kubernetes'],
      nonTechSkills: ['System Design', 'Leadership'],
      interests: ['Backend Development', 'DevOps', 'System Architecture'],
      preferredRole: 'Backend Developer',
      personalityStyle: 'Structured',
      experienceLevel: 'Advanced',
      availability: '20+ hr/week',
      college: 'NIT Goa',
      branch: 'Computer Science',
      year: '4th Year',
      degree: 'B.Tech',
      github: 'github.com/rohandesai',
      linkedin: 'linkedin.com/in/rohandesai',
    },
    {
      name: 'Sara Mathews',
      email: 'sara.mathews@student.nitgoa.ac.in',
      techSkills: ['Figma', 'Adobe XD', 'Illustrator', 'HTML/CSS', 'React'],
      nonTechSkills: ['Illustration', 'Branding', 'User Research'],
      interests: ['UI/UX Design', 'Graphic Design', 'Product Design'],
      preferredRole: 'UI/UX Designer',
      personalityStyle: 'Creative',
      experienceLevel: 'Intermediate',
      availability: '10-15 hr/week',
      college: 'NIT Goa',
      branch: 'Electronics',
      year: '3rd Year',
      degree: 'B.Tech',
      portfolio: 'saramathews.design',
      linkedin: 'linkedin.com/in/saramathews',
    },
    {
      name: 'Jay Mehta',
      email: 'jay.mehta@student.nitgoa.ac.in',
      techSkills: ['AWS', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD'],
      nonTechSkills: ['System Administration', 'Documentation'],
      interests: ['Cloud Computing', 'DevOps', 'Infrastructure'],
      preferredRole: 'DevOps Engineer',
      personalityStyle: 'Structured',
      experienceLevel: 'Intermediate',
      availability: '15-20 hr/week',
      college: 'NIT Goa',
      branch: 'Computer Science',
      year: '3rd Year',
      degree: 'B.Tech',
      github: 'github.com/jaymehta',
      linkedin: 'linkedin.com/in/jaymehta',
    },
    {
      name: 'Priya Reddy',
      email: 'priya.reddy@student.nitgoa.ac.in',
      techSkills: ['Flutter', 'Dart', 'Firebase', 'REST APIs', 'State Management'],
      nonTechSkills: ['Mobile UX', 'Prototyping'],
      interests: ['Mobile Development', 'Cross-platform Apps', 'UI/UX'],
      preferredRole: 'Mobile Developer',
      personalityStyle: 'Flexible',
      experienceLevel: 'Intermediate',
      availability: '10-15 hr/week',
      college: 'NIT Goa',
      branch: 'Electronics',
      year: '2nd Year',
      degree: 'B.Tech',
      github: 'github.com/priyareddy',
      portfolio: 'priyareddy.dev',
    },
    {
      name: 'Vikram Singh',
      email: 'vikram.singh@student.nitgoa.ac.in',
      techSkills: ['C++', 'Python', 'Arduino', 'Raspberry Pi', 'IoT', 'Embedded Systems'],
      nonTechSkills: ['Hardware Prototyping', 'Circuit Design'],
      interests: ['IoT', 'Hardware', 'Robotics', 'Automation'],
      preferredRole: 'IoT Developer',
      personalityStyle: 'Analytical',
      experienceLevel: 'Advanced',
      availability: '15-20 hr/week',
      college: 'NIT Goa',
      branch: 'Electronics',
      year: '4th Year',
      degree: 'B.Tech',
      github: 'github.com/vikramsingh',
      linkedin: 'linkedin.com/in/vikramsingh',
    },
    {
      name: 'Ananya Krishnan',
      email: 'ananya.krishnan@student.nitgoa.ac.in',
      techSkills: ['JavaScript', 'React', 'Vue.js', 'Node.js', 'GraphQL'],
      nonTechSkills: ['Technical Writing', 'Mentoring'],
      interests: ['Web Development', 'Open Source', 'Community Building'],
      preferredRole: 'Frontend Developer',
      personalityStyle: 'Flexible',
      experienceLevel: 'Intermediate',
      availability: '10-20 hr/week',
      college: 'NIT Goa',
      branch: 'Computer Science',
      year: '3rd Year',
      degree: 'B.Tech',
      github: 'github.com/ananyakrishnan',
      linkedin: 'linkedin.com/in/ananyakrishnan',
      portfolio: 'ananyakrishnan.dev',
    },
  ];

  const userIds = [];
  
  for (const user of users) {
    const userRef = doc(db, 'users', `seed_${user.email.split('@')[0]}`);
    await setDoc(userRef, {
      ...user,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    userIds.push(userRef.id);
    console.log(`  ✓ Created user: ${user.name}`);
  }

  console.log(`✅ Seeded ${users.length} users\n`);
  return userIds;
}

/**
 * Seed Projects
 */
async function seedProjects(userIds) {
  console.log('🌱 Seeding projects...');
  
  const projects = [
    {
      title: 'AI Diet Planner using Vision + GPT',
      description: 'An intelligent diet planning app that uses computer vision to identify food items from photos and GPT to generate personalized meal plans based on dietary preferences, health goals, and nutritional requirements. Features include calorie tracking, macro breakdown, and recipe suggestions.',
      category: 'AI/ML',
      tags: ['AI/ML', 'Health', 'Mobile App', 'Computer Vision'],
      requiredSkills: ['Python', 'TensorFlow', 'OpenAI API', 'React Native', 'Image Processing'],
      ownerId: userIds[1], // Ishita Sharma
      ownerEmail: 'ishita.sharma@student.nitgoa.ac.in',
      upvotes: 12,
      upvoters: [],
      commentsCount: 0,
    },
    {
      title: 'College Fest Management System',
      description: 'A comprehensive platform for managing college festivals with features like event registration, participant management, schedule coordination, payment integration, and real-time notifications. Includes admin dashboard and mobile app for attendees.',
      category: 'Web Development',
      tags: ['Web Development', 'Event Management', 'Full Stack'],
      requiredSkills: ['React', 'Node.js', 'MongoDB', 'Payment Gateway', 'Real-time Updates'],
      ownerId: userIds[0], // Aarav Patel
      ownerEmail: 'aarav.patel@student.nitgoa.ac.in',
      upvotes: 18,
      upvoters: [],
      commentsCount: 0,
    },
    {
      title: 'Crowdsourced Local Data Map',
      description: 'A community-driven mapping platform where users can add and verify local information like restaurants, shops, services, and events. Features include real-time updates, user ratings, photo uploads, and route planning integration.',
      category: 'Web Development',
      tags: ['Web Development', 'Maps', 'Community', 'Crowdsourcing'],
      requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'Map APIs', 'Geolocation'],
      ownerId: userIds[2], // Rohan Desai
      ownerEmail: 'rohan.desai@student.nitgoa.ac.in',
      upvotes: 15,
      upvoters: [],
      commentsCount: 0,
    },
    {
      title: 'Smart Parking IoT App',
      description: 'An IoT-based smart parking solution that uses sensors to detect parking space availability in real-time. Users can find and reserve parking spots through a mobile app. Includes features like payment integration, navigation, and analytics dashboard.',
      category: 'IoT',
      tags: ['IoT', 'Mobile App', 'Hardware', 'Smart City'],
      requiredSkills: ['Arduino', 'Raspberry Pi', 'Flutter', 'Backend APIs', 'IoT Sensors'],
      ownerId: userIds[6], // Vikram Singh
      ownerEmail: 'vikram.singh@student.nitgoa.ac.in',
      upvotes: 22,
      upvoters: [],
      commentsCount: 0,
    },
    {
      title: 'Mental Wellness Companion App',
      description: 'A supportive mental health app featuring mood tracking, guided meditation, journaling, crisis resources, and anonymous peer support. Designed with privacy-first approach and beautiful, calming UI to encourage daily use.',
      category: 'Mobile App',
      tags: ['Mobile App', 'Health', 'UI/UX', 'Wellness'],
      requiredSkills: ['Flutter', 'UI/UX Design', 'Firebase', 'Psychology Research'],
      ownerId: userIds[3], // Sara Mathews
      ownerEmail: 'sara.mathews@student.nitgoa.ac.in',
      upvotes: 25,
      upvoters: [],
      commentsCount: 0,
    },
    {
      title: 'Code Collaboration Platform for Students',
      description: 'A GitHub-like platform specifically designed for students to collaborate on coding projects. Features include real-time code editing, project templates, peer review system, and integration with popular development tools.',
      category: 'Web Development',
      tags: ['Web Development', 'Collaboration', 'Education', 'Developer Tools'],
      requiredSkills: ['React', 'WebSockets', 'Docker', 'Git Integration', 'Real-time Collaboration'],
      ownerId: userIds[7], // Ananya Krishnan
      ownerEmail: 'ananya.krishnan@student.nitgoa.ac.in',
      upvotes: 20,
      upvoters: [],
      commentsCount: 0,
    },
  ];

  const projectIds = [];
  
  for (const project of projects) {
    const projectRef = await addDoc(collection(db, 'projects'), {
      ...project,
      members: [project.ownerId],
      createdAt: serverTimestamp(),
    });
    projectIds.push(projectRef.id);
    console.log(`  ✓ Created project: ${project.title}`);
  }

  console.log(`✅ Seeded ${projects.length} projects\n`);
  return projectIds;
}

/**
 * Seed Events
 */
async function seedEvents() {
  console.log('🌱 Seeding events...');
  
  const events = [
    {
      title: 'Smart India Hackathon 2024 - Qualifiers',
      organizer: 'NIT Goa Tech Club',
      description: 'National-level hackathon qualifiers. Build innovative solutions for real-world problems. Categories: AI/ML, Web Dev, IoT, Healthcare. Prizes worth ₹2,00,000.',
      domain: 'Hackathon',
      tags: ['AI/ML', 'WebDev', 'IoT', 'Healthcare'],
      location: 'NIT Goa Campus',
      startDate: Timestamp.fromDate(new Date('2024-12-15T09:00:00')),
      endDate: Timestamp.fromDate(new Date('2024-12-17T18:00:00')),
      availability: 'Open',
      registerLink: 'https://sih.nitgoa.ac.in/register',
    },
    {
      title: 'MLH Build Weekend - December',
      organizer: 'Major League Hacking',
      description: '48-hour global hackathon. Build anything you want! Great for beginners. Free swag, mentorship, and prizes. Join thousands of developers worldwide.',
      domain: 'Hackathon',
      tags: ['WebDev', 'Mobile', 'Open Source'],
      location: 'Online',
      startDate: Timestamp.fromDate(new Date('2024-12-07T00:00:00')),
      endDate: Timestamp.fromDate(new Date('2024-12-09T23:59:59')),
      availability: 'Open',
      registerLink: 'https://mlh.io/build',
    },
    {
      title: 'Google Developer Club WebJam',
      organizer: 'GDSC NIT Goa',
      description: 'Build a web app in 24 hours! Focus on modern web technologies. Workshops on React, Next.js, and Firebase. Networking session included.',
      domain: 'Hackathon',
      tags: ['WebDev', 'React', 'Next.js'],
      location: 'NIT Goa Campus',
      startDate: Timestamp.fromDate(new Date('2024-11-30T10:00:00')),
      endDate: Timestamp.fromDate(new Date('2024-12-01T10:00:00')),
      availability: 'Limited',
      registerLink: 'https://gdsc.nitgoa.ac.in/webjam',
    },
    {
      title: 'IIT TechFest Robotics Workshop',
      organizer: 'IIT Bombay TechFest',
      description: 'Hands-on workshop on robotics and automation. Learn about sensors, actuators, and control systems. Build your own robot!',
      domain: 'Workshop',
      tags: ['Robotics', 'IoT', 'Hardware'],
      location: 'IIT Bombay',
      startDate: Timestamp.fromDate(new Date('2024-12-10T09:00:00')),
      endDate: Timestamp.fromDate(new Date('2024-12-10T17:00:00')),
      availability: 'Limited',
      registerLink: 'https://techfest.org/workshops',
    },
    {
      title: 'UI/UX Design Bootcamp',
      organizer: 'Design Society NIT Goa',
      description: 'Intensive 3-day bootcamp covering design principles, Figma, user research, and prototyping. Portfolio review session included.',
      domain: 'Workshop',
      tags: ['UI/UX', 'Design', 'Figma'],
      location: 'Online',
      startDate: Timestamp.fromDate(new Date('2024-11-25T14:00:00')),
      endDate: Timestamp.fromDate(new Date('2024-11-27T18:00:00')),
      availability: 'Open',
      registerLink: 'https://designsoc.nitgoa.ac.in/bootcamp',
    },
    {
      title: 'Cloud Computing & DevOps Summit',
      organizer: 'AWS Student Community',
      description: 'Learn about cloud infrastructure, containerization, CI/CD pipelines, and serverless architecture. Hands-on labs with AWS credits provided.',
      domain: 'Workshop',
      tags: ['Cloud', 'DevOps', 'AWS'],
      location: 'Online',
      startDate: Timestamp.fromDate(new Date('2024-12-05T10:00:00')),
      endDate: Timestamp.fromDate(new Date('2024-12-05T16:00:00')),
      availability: 'Open',
      registerLink: 'https://awsstudents.in/summit',
    },
  ];

  for (const event of events) {
    await addDoc(collection(db, 'events'), {
      ...event,
      createdAt: serverTimestamp(),
    });
    console.log(`  ✓ Created event: ${event.title}`);
  }

  console.log(`✅ Seeded ${events.length} events\n`);
}

/**
 * Seed Comments
 */
async function seedComments(projectIds, userIds) {
  console.log('🌱 Seeding comments...');
  
  const commentTemplates = [
    'This looks really interesting! I\'d love to collaborate on this project.',
    'Great idea! I have experience with {skill} and would be happy to help.',
    'Count me in! This aligns perfectly with my interests.',
    'I\'m working on something similar. Would love to discuss collaboration opportunities.',
    'This is exactly what I was looking for! How can I contribute?',
    'Amazing project! I can help with the {skill} part.',
    'Interested in joining! I have {years} years of experience in this domain.',
  ];

  const skills = ['React', 'Backend', 'Design', 'ML', 'Mobile Development', 'DevOps'];
  const years = ['2', '3', '4'];

  let commentCount = 0;

  for (const projectId of projectIds) {
    // Add 3-5 comments per project
    const numComments = Math.floor(Math.random() * 3) + 3; // 3-5 comments
    
    for (let i = 0; i < numComments; i++) {
      // Pick a random user (not the project owner)
      const projectOwnerIndex = projectIds.indexOf(projectId);
      const availableUsers = userIds.filter((_, idx) => idx !== projectOwnerIndex);
      const randomUserIndex = Math.floor(Math.random() * availableUsers.length);
      const userId = availableUsers[randomUserIndex];
      
      // Get user email (from seed data)
      const userEmails = [
        'aarav.patel@student.nitgoa.ac.in',
        'ishita.sharma@student.nitgoa.ac.in',
        'rohan.desai@student.nitgoa.ac.in',
        'sara.mathews@student.nitgoa.ac.in',
        'jay.mehta@student.nitgoa.ac.in',
        'priya.reddy@student.nitgoa.ac.in',
        'vikram.singh@student.nitgoa.ac.in',
        'ananya.krishnan@student.nitgoa.ac.in',
      ];
      const userEmail = userEmails[userIds.indexOf(userId)] || 'user@example.com';
      
      // Generate comment text
      let commentText = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
      commentText = commentText.replace('{skill}', skills[Math.floor(Math.random() * skills.length)]);
      commentText = commentText.replace('{years}', years[Math.floor(Math.random() * years.length)]);
      
      await addDoc(collection(db, 'comments'), {
        projectId,
        userId,
        userEmail,
        text: commentText,
        parentId: null,
        createdAt: serverTimestamp(),
      });
      
      commentCount++;
    }
    
    // Update project comments count (once per project)
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    if (projectSnap.exists()) {
      const currentCount = projectSnap.data().commentsCount || 0;
      await updateDoc(projectRef, { commentsCount: currentCount + numComments });
    }
    
    console.log(`  ✓ Added ${numComments} comments to project ${projectIds.indexOf(projectId) + 1}`);
  }

  console.log(`✅ Seeded ${commentCount} comments\n`);
}

/**
 * Main seed function
 */
async function seed() {
  try {
    console.log('🚀 Starting seed process...\n');
    
    // Seed users first
    const userIds = await seedUsers();
    
    // Seed projects (using user IDs)
    const projectIds = await seedProjects(userIds);
    
    // Seed events
    await seedEvents();
    
    // Seed comments (using project IDs and user IDs)
    await seedComments(projectIds, userIds);
    
    console.log('✅ Seed completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Users: 8`);
    console.log(`   - Projects: 6`);
    console.log(`   - Events: 6`);
    console.log(`   - Comments: ~18-30`);
    console.log('\n🎉 Demo data is ready for judging!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();

