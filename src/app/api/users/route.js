import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * GET /api/users
 * Get user data
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: userSnap.id, ...userSnap.data() },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users
 * Create or update user data
 */
export async function POST(request) {
  try {
    const { userId, userData } = await request.json();

    if (!userId || !userData) {
      return NextResponse.json(
        { success: false, error: 'User ID and user data are required' },
        { status: 400 }
      );
    }

    const userRef = doc(firestore, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'User data saved successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users
 * Update user data
 */
export async function PUT(request) {
  try {
    const { userId, userData } = await request.json();

    if (!userId || !userData) {
      return NextResponse.json(
        { success: false, error: 'User ID and user data are required' },
        { status: 400 }
      );
    }

    const userRef = doc(firestore, 'users', userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'User data updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

