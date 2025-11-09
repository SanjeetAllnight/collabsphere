/**
 * Update Project Categories Script
 * Assigns default categories to projects missing the category field
 * Based on tags and title analysis
 * 
 * Run with: node src/scripts/updateProjectCategories.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

// Valid categories
const VALID_CATEGORIES = ['WebDev', 'AI/ML', 'IoT', 'AppDev', 'Cybersec', 'Blockchain', 'Others'];

/**
 * Infer category from tags and title
 */
function inferCategory(project) {
  const title = (project.title || '').toLowerCase();
  const description = (project.description || '').toLowerCase();
  const tags = (project.tags || []).map(t => t.toLowerCase());
  const allText = `${title} ${description} ${tags.join(' ')}`;

  // AI/ML keywords
  if (
    allText.includes('ai') || allText.includes('machine learning') || 
    allText.includes('ml') || allText.includes('neural') || 
    allText.includes('tensorflow') || allText.includes('pytorch') ||
    allText.includes('deep learning') || allText.includes('computer vision')
  ) {
    return 'AI/ML';
  }

  // IoT keywords
  if (
    allText.includes('iot') || allText.includes('internet of things') ||
    allText.includes('arduino') || allText.includes('raspberry pi') ||
    allText.includes('sensor') || allText.includes('smart home') ||
    allText.includes('embedded')
  ) {
    return 'IoT';
  }

  // Blockchain keywords
  if (
    allText.includes('blockchain') || allText.includes('crypto') ||
    allText.includes('ethereum') || allText.includes('solidity') ||
    allText.includes('web3') || allText.includes('smart contract')
  ) {
    return 'Blockchain';
  }

  // Cybersecurity keywords
  if (
    allText.includes('cyber') || allText.includes('security') ||
    allText.includes('penetration') || allText.includes('hack') ||
    allText.includes('vulnerability') || allText.includes('encryption')
  ) {
    return 'Cybersec';
  }

  // App Development keywords
  if (
    allText.includes('mobile app') || allText.includes('flutter') ||
    allText.includes('react native') || allText.includes('ios') ||
    allText.includes('android') || allText.includes('app development')
  ) {
    return 'AppDev';
  }

  // WebDev keywords (default for web-related)
  if (
    allText.includes('web') || allText.includes('react') ||
    allText.includes('node') || allText.includes('frontend') ||
    allText.includes('backend') || allText.includes('full stack') ||
    allText.includes('javascript') || allText.includes('html') ||
    allText.includes('css') || allText.includes('api')
  ) {
    return 'WebDev';
  }

  // Default
  return 'Others';
}

/**
 * Main update function
 */
async function updateProjectCategories() {
  try {
    console.log('🚀 Starting project category update...\n');

    const projectsRef = collection(db, 'projects');
    const querySnapshot = await getDocs(projectsRef);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      const project = docSnapshot.data();
      const projectId = docSnapshot.id;

      // Check if category exists and is valid
      if (project.category && VALID_CATEGORIES.includes(project.category)) {
        console.log(`  ✓ Project "${project.title}" already has valid category: ${project.category}`);
        skippedCount++;
        continue;
      }

      // Infer category
      const inferredCategory = inferCategory(project);
      
      // Update the document
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        category: inferredCategory,
      });

      console.log(`  ✓ Updated "${project.title}" → category: ${inferredCategory}`);
      updatedCount++;
    }

    console.log(`\n✅ Update completed!`);
    console.log(`   - Updated: ${updatedCount} projects`);
    console.log(`   - Skipped: ${skippedCount} projects (already have valid category)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating project categories:', error);
    process.exit(1);
  }
}

// Run the update function
updateProjectCategories();

