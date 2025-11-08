import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { logActivity } from '@/lib/activity';
import { addNotification } from '@/lib/db';

/**
 * POST /api/upvotes
 * Add an upvote to a project
 * Body: { projectId, userId }
 */
export async function POST(request) {
  try {
    const { projectId, userId } = await request.json();

    if (!projectId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, userId' },
        { status: 400 }
      );
    }

    const projectRef = doc(firestore, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectSnap.data();
    const upvoters = projectData.upvoters || [];

    // Check if user already upvoted
    if (upvoters.includes(userId)) {
      return NextResponse.json(
        { success: false, error: 'User has already upvoted this project' },
        { status: 400 }
      );
    }

    // Add user to upvoters and increment upvotes atomically
    await updateDoc(projectRef, {
      upvoters: arrayUnion(userId),
      upvotes: increment(1),
    });

    // Log activity
    await logActivity(userId, 'upvoted', { projectId });

    // Optional notification for project owner
    try {
      if (projectData.ownerId && projectData.ownerId !== userId) {
        const userRef = doc(firestore, 'users', userId);
        const userSnap = await getDoc(userRef);
        let upvoterName = 'Someone';
        if (userSnap.exists()) {
          const userData = userSnap.data();
          upvoterName = userData.name || userData.email || 'Someone';
        }
        
        await addNotification(projectData.ownerId, {
          title: 'Project Upvoted',
          description: `${upvoterName} upvoted your project`,
          type: 'upvote',
          link: `/project/${projectId}`,
        });
      }
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Upvote added successfully',
    });
  } catch (error) {
    console.error('Error adding upvote:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/upvotes
 * Remove an upvote from a project
 * Body: { projectId, userId }
 */
export async function DELETE(request) {
  try {
    const { projectId, userId } = await request.json();

    if (!projectId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: projectId, userId' },
        { status: 400 }
      );
    }

    const projectRef = doc(firestore, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const projectData = projectSnap.data();
    const upvoters = projectData.upvoters || [];
    const currentUpvotes = projectData.upvotes || 0;

    // Check if user has upvoted
    if (!upvoters.includes(userId)) {
      return NextResponse.json(
        { success: false, error: 'User has not upvoted this project' },
        { status: 400 }
      );
    }

    // Remove user from upvoters and decrement upvotes (min 0)
    const newUpvotes = Math.max(0, currentUpvotes - 1);
    await updateDoc(projectRef, {
      upvoters: arrayRemove(userId),
      upvotes: newUpvotes,
    });

    return NextResponse.json({
      success: true,
      message: 'Upvote removed successfully',
    });
  } catch (error) {
    console.error('Error removing upvote:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

