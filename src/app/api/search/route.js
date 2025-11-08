import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * GET /api/search?q=
 * Search both users and posts in Firestore
 * Supports partial matching on:
 * - Users: name, skills[]
 * - Posts: title, description (content)
 * 
 * Returns: { users: [...], posts: [...] }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Validate query parameter
    if (!query || query.trim() === '') {
      return NextResponse.json({
        users: [],
        posts: [],
      });
    }

    const searchTerm = query.trim().toLowerCase();

    // Fetch all users
    const usersRef = collection(firestore, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    // Fetch all posts
    const postsRef = collection(firestore, 'posts');
    const postsSnapshot = await getDocs(postsRef);

    // Filter users: match name or skills
    const matchedUsers = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;
      
      // Check if name matches (partial match)
      const nameMatch = userData.name && 
        userData.name.toLowerCase().includes(searchTerm);
      
      // Check if any skill matches (partial match)
      const skillsMatch = Array.isArray(userData.skills) && 
        userData.skills.some(skill => 
          skill && skill.toLowerCase().includes(searchTerm)
        );
      
      if (nameMatch || skillsMatch) {
        matchedUsers.push({
          id: userId,
          ...userData,
        });
      }
    });

    // Filter posts: match title or description (content)
    const matchedPosts = [];
    postsSnapshot.forEach((doc) => {
      const postData = doc.data();
      const postId = doc.id;
      
      // Check if title matches (partial match)
      const titleMatch = postData.title && 
        postData.title.toLowerCase().includes(searchTerm);
      
      // Check if description matches (partial match)
      const descriptionMatch = postData.description && 
        postData.description.toLowerCase().includes(searchTerm);
      
      if (titleMatch || descriptionMatch) {
        matchedPosts.push({
          id: postId,
          ...postData,
        });
      }
    });

    return NextResponse.json({
      users: matchedUsers,
      posts: matchedPosts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

