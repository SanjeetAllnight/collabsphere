import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '@/lib/activity';
import { addNotification } from '@/lib/db';

/**
 * POST /api/comments
 * Create a new comment (supports threaded replies)
 * Body: { projectId, userId, userEmail, text, parentId? }
 */
export async function POST(request) {
  try {
    const { projectId, userId, userEmail, text, parentId } = await request.json();

    if (!projectId || !userId || !text) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, userId, text' },
        { status: 400 }
      );
    }

    const commentsRef = collection(firestore, 'comments');
    const commentData = {
      projectId,
      userId,
      userEmail: userEmail || '',
      text: text.trim(),
      parentId: parentId || null,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(commentsRef, commentData);

    // Increment comments count on project
    const projectRef = doc(firestore, 'projects', projectId);
    await updateDoc(projectRef, {
      commentsCount: increment(1),
    });

    // Log activity
    await logActivity(userId, 'commented', { projectId, commentId: docRef.id });

    // Get project owner to send notification
    try {
      const projectRef = doc(firestore, 'projects', projectId);
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists()) {
        const projectData = projectSnap.data();
        if (projectData.ownerId && projectData.ownerId !== userId) {
          // Get commenter name
          const userRef = doc(firestore, 'users', userId);
          const userSnap = await getDoc(userRef);
          let commenterName = userEmail || 'Someone';
          if (userSnap.exists()) {
            const userData = userSnap.data();
            commenterName = userData.name || userEmail || 'Someone';
          }
          
          await addNotification(projectData.ownerId, {
            title: 'New Comment',
            description: `${commenterName} commented on your project`,
            type: 'comment',
            link: `/project/${projectId}`,
          });
        }
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      commentId: docRef.id,
      message: 'Comment added successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/comments
 * Get comments for a project (with threaded structure)
 * Query params: projectId
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      );
    }

    const commentsRef = collection(firestore, 'comments');
    const q = query(
      commentsRef,
      where('projectId', '==', projectId),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const comments = [];
    const commentsMap = new Map();

    // First pass: collect all comments
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const comment = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
        replies: [],
      };
      commentsMap.set(doc.id, comment);
    });

    // Second pass: build threaded structure
    const rootComments = [];
    commentsMap.forEach((comment) => {
      if (comment.parentId) {
        // This is a reply
        const parent = commentsMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(comment);
        } else {
          // Parent not found, treat as root
          rootComments.push(comment);
        }
      } else {
        // This is a root comment
        rootComments.push(comment);
      }
    });

    return NextResponse.json({
      success: true,
      comments: rootComments,
      count: rootComments.length,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
