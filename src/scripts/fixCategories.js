/**
 * Fix Project Categories Script
 * Assigns categories to projects missing the category field based on tags
 * 
 * Run with: npm run fix-categories
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

/**
 * Assign category based on tags
 */
function assignCategoryFromTags(tags) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return 'Others';
  }

  // Convert tags to lowercase for case-insensitive matching
  const tagsLower = tags.map(tag => tag.toLowerCase());

  // WebDev: HTML/CSS/React/Next.js
  if (
    tagsLower.some(tag => 
      tag.includes('html') || 
      tag.includes('css') || 
      tag.includes('react') || 
      tag.includes('next.js') ||
      tag.includes('nextjs') ||
      tag.includes('javascript') ||
      tag.includes('js') ||
      tag.includes('node') ||
      tag.includes('web')
    )
  ) {
    return 'WebDev';
  }

  // AI/ML: TensorFlow, PyTorch, ML, AI
  if (
    tagsLower.some(tag => 
      tag.includes('tensorflow') || 
      tag.includes('pytorch') || 
      tag.includes('ml') || 
      tag.includes('machine learning') ||
      tag.includes('ai') ||
      tag.includes('artificial intelligence') ||
      tag.includes('deep learning') ||
      tag.includes('neural')
    )
  ) {
    return 'AI/ML';
  }

  // IoT: sensors, microcontroller, arduino
  if (
    tagsLower.some(tag => 
      tag.includes('sensor') || 
      tag.includes('microcontroller') || 
      tag.includes('arduino') ||
      tag.includes('raspberry pi') ||
      tag.includes('iot') ||
      tag.includes('internet of things') ||
      tag.includes('embedded')
    )
  ) {
    return 'IoT';
  }

  // AppDev: flutter, react-native
  if (
    tagsLower.some(tag => 
      tag.includes('flutter') || 
      tag.includes('react-native') ||
      tag.includes('react native') ||
      tag.includes('mobile') ||
      tag.includes('ios') ||
      tag.includes('android') ||
      tag.includes('app')
    )
  ) {
    return 'AppDev';
  }

  // Cybersec: security, encryption
  if (
    tagsLower.some(tag => 
      tag.includes('security') || 
      tag.includes('encryption') ||
      tag.includes('cyber') ||
      tag.includes('cybersecurity') ||
      tag.includes('penetration') ||
      tag.includes('hack') ||
      tag.includes('vulnerability')
    )
  ) {
    return 'Cybersec';
  }

  // Blockchain: solidity, ethereum
  if (
    tagsLower.some(tag => 
      tag.includes('solidity') || 
      tag.includes('ethereum') ||
      tag.includes('blockchain') ||
      tag.includes('crypto') ||
      tag.includes('web3') ||
      tag.includes('smart contract')
    )
  ) {
    return 'Blockchain';
  }

  // Default to Others
  return 'Others';
}

/**
 * Main fix function
 */
async function fixCategories() {
  try {
    console.log('🚀 Starting category fix...\n');

    const projectsRef = collection(db, 'projects');
    const querySnapshot = await getDocs(projectsRef);

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const docSnapshot of querySnapshot.docs) {
      const project = docSnapshot.data();
      const projectId = docSnapshot.id;

      // Check if category already exists
      if (project.category) {
        console.log(`  ✓ Project "${project.title}" already has category: ${project.category}`);
        skippedCount++;
        continue;
      }

      // Assign category based on tags
      const assignedCategory = assignCategoryFromTags(project.tags);
      
      try {
        // Update the document
        const projectRef = doc(db, 'projects', projectId);
        await updateDoc(projectRef, {
          category: assignedCategory,
        });

        console.log(`  ✓ Fixed "${project.title}" → category: ${assignedCategory} (tags: ${(project.tags || []).join(', ') || 'none'})`);
        fixedCount++;
      } catch (updateError) {
        console.error(`  ✗ Error updating "${project.title}":`, updateError.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Fix completed!`);
    console.log(`   - Fixed: ${fixedCount} projects`);
    console.log(`   - Skipped: ${skippedCount} projects (already have category)`);
    if (errorCount > 0) {
      console.log(`   - Errors: ${errorCount} projects`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing categories:', error);
    process.exit(1);
  }
}

// Run the fix function
fixCategories();

