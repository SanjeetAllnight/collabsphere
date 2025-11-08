import { NextResponse } from 'next/server';
import { createPost, getAllPosts } from '@/lib/db';
import { firestore } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

/**
 * GET /api/posts
 * Get all posts (optionally filter by category)
 * Query params: ?category=Technical
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const { success, posts, error } = await getAllPosts();

    if (!success) {
      return NextResponse.json(
        { success: false, error: error || 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    // Filter by category if provided
    let filteredPosts = posts;
    if (category && category !== 'All') {
      filteredPosts = posts.filter(post => post.category === category);
    }

    return NextResponse.json({
      success: true,
      posts: filteredPosts,
      count: filteredPosts.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts
 * Create a new post
 * Body: { userId, email, title, description, category }
 */
export async function POST(request) {
  try {
    const { userId, email, title, description, category } = await request.json();

    // Validate required fields
    if (!userId || !title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: userId, title, description, category' },
        { status: 400 }
      );
    }

    // Validate title and description are not empty
    if (title.trim() === '' || description.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Title and description cannot be empty' },
        { status: 400 }
      );
    }

    // Create post using db helper function (email will be added separately if provided)
    const { success, postId, error } = await createPost(userId, title.trim(), description.trim(), category);

    if (!success) {
      return NextResponse.json(
        { success: false, error: error || 'Failed to create post' },
        { status: 500 }
      );
    }

    // If email is provided, update the post to include it
    if (email && postId) {
      const postRef = doc(firestore, 'posts', postId);
      await updateDoc(postRef, { email });
    }

    return NextResponse.json({
      success: true,
      postId,
      message: 'Post created successfully',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

