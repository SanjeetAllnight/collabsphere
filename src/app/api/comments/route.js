import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';

/**
 * POST /api/comments
 * Add a comment to Firestore
 * Body: { postId, userId, commentText, userEmail }
 */
export async function POST(request) {
  try {
    const { postId, userId, commentText, userEmail } = await request.json();

    // Validate required fields
    if (!postId || !userId || !commentText || !userEmail) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: postId, userId, commentText, userEmail' },
        { status: 400 }
      );
    }

    // Validate commentText is not empty
    if (commentText.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Comment text cannot be empty' },
        { status: 400 }
      );
    }

    // Add comment to Firestore comments collection
    const commentsRef = collection(firestore, 'comments');
    const docRef = await addDoc(commentsRef, {
      postId,
      userId,
      commentText: commentText.trim(),
      userEmail,
      createdAt: new Date(),
    });

    // Get the post to find the owner
    try {
      const postRef = doc(firestore, 'posts', postId);
      const postSnap = await getDoc(postRef);

      if (postSnap.exists()) {
        const postData = postSnap.data();
        const postOwnerId = postData.ownerId;

        // Only create notification if commenter is NOT the post owner
        if (postOwnerId && postOwnerId !== userId) {
          const notificationsRef = collection(firestore, 'notifications');
          await addDoc(notificationsRef, {
            userId: postOwnerId,
            title: 'New Comment',
            message: `${userEmail} commented on your post.`,
            link: `/chat/${postId}`,
            createdAt: Timestamp.now(),
            read: false,
          });
        }
      }
    } catch (notifError) {
      // Log error but don't fail the comment creation
      console.error('Failed to create notification:', notifError);
    }

    return NextResponse.json({
      success: true,
      commentId: docRef.id,
      message: 'Comment added successfully',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/comments?postId=<id>
 * Get all comments for a specific post
 * Ordered by createdAt ascending (oldest first)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId query parameter is required' },
        { status: 400 }
      );
    }

    // Query comments for the specific post, ordered by createdAt ascending
    const commentsRef = collection(firestore, 'comments');
    const q = query(
      commentsRef,
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);

    const comments = [];
    querySnapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return NextResponse.json({
      success: true,
      comments,
      count: comments.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

