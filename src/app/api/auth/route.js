import { NextResponse } from 'next/server';
import { signIn, register, logout } from '@/lib/auth';

/**
 * POST /api/auth
 * Handle user authentication (login, register, logout)
 */
export async function POST(request) {
  try {
    const { email, password, action } = await request.json();

    if (action === 'login') {
      const { user, error } = await signIn(email, password);
      
      if (error) {
        return NextResponse.json(
          { success: false, error },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
        },
      });
    }

    if (action === 'register') {
      const { user, error } = await register(email, password);
      
      if (error) {
        return NextResponse.json(
          { success: false, error },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          uid: user.uid,
          email: user.email,
        },
      });
    }

    if (action === 'logout') {
      const { error } = await logout();
      
      if (error) {
        return NextResponse.json(
          { success: false, error },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

