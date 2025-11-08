import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

/**
 * POST /api/follow
 * Follow a user
 * Body: { followerId, followingId }
 */
export async function POST(request) {
  try {
    const { followerId, followingId } = await request.json();

    // Validate required fields
    if (!followerId || !followingId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: followerId, followingId' },
        { status: 400 }
      );
    }

    // Prevent following yourself
    if (followerId === followingId) {
      return NextResponse.json(
        { success: false, error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Add to followers collection: followers/{followingId}/userFollowers/{followerId}
    const followersRef = doc(firestore, 'followers', followingId, 'userFollowers', followerId);
    await setDoc(followersRef, {
      followerId,
      followingId,
      createdAt: new Date(),
    });

    // Add to following collection: following/{followerId}/userFollowing/{followingId}
    const followingRef = doc(firestore, 'following', followerId, 'userFollowing', followingId);
    await setDoc(followingRef, {
      followerId,
      followingId,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Followed',
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/follow
 * Unfollow a user
 * Body: { followerId, followingId }
 */
export async function DELETE(request) {
  try {
    const { followerId, followingId } = await request.json();

    // Validate required fields
    if (!followerId || !followingId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: followerId, followingId' },
        { status: 400 }
      );
    }

    // Prevent unfollowing yourself (though this shouldn't happen)
    if (followerId === followingId) {
      return NextResponse.json(
        { success: false, error: 'Cannot unfollow yourself' },
        { status: 400 }
      );
    }

    // Remove from followers collection: followers/{followingId}/userFollowers/{followerId}
    const followersRef = doc(firestore, 'followers', followingId, 'userFollowers', followerId);
    await deleteDoc(followersRef);

    // Remove from following collection: following/{followerId}/userFollowing/{followingId}
    const followingRef = doc(firestore, 'following', followerId, 'userFollowing', followingId);
    await deleteDoc(followingRef);

    return NextResponse.json({
      success: true,
      message: 'Unfollowed',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

