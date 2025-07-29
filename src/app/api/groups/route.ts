
import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const q = query(collection(db, 'groups'), where('memberUIDs', 'array-contains', userId));
    const querySnapshot = await getDocs(q);
    const groups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Error fetching groups: ', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, memberUIDs, createdBy } = body;

        if (!name || !memberUIDs || !createdBy) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const docRef = await addDoc(collection(db, 'groups'), {
            name,
            memberUIDs,
            createdBy,
            createdAt: new Date(),
        });

        return NextResponse.json({ id: docRef.id, ...body }, { status: 201 });
    } catch (error) {
        console.error('Error creating group:', error);
        return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }
}
