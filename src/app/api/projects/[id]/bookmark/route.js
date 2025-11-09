import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id || !userId) return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 });

    const projectRef = doc(firestore, 'projects', id);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    await updateDoc(projectRef, { bookmarkedBy: arrayUnion(userId) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id || !userId) return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 });

    const projectRef = doc(firestore, 'projects', id);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    await updateDoc(projectRef, { bookmarkedBy: arrayRemove(userId) });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
