
import { NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    try {
        if (projectId) {
            // Fetch a single project
            const docRef = doc(db, 'projects', projectId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return NextResponse.json({ id: docSnap.id, ...docSnap.data() });
            } else {
                return NextResponse.json({ error: 'Project not found' }, { status: 404 });
            }
        } else if (userId) {
            // Fetch all projects for a user
            let q;
            if (role === 'admin') {
                q = query(collection(db, 'projects'));
            } else {
                q = query(collection(db, 'projects'), where('members', 'array-contains', userId));
            }
            const querySnapshot = await getDocs(q);
            const projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return NextResponse.json(projects);
        } else {
            // Invalid request
            return NextResponse.json({ error: 'Project ID or User ID is required' }, { status: 400 });
        }
    } catch (error) {
        console.error("Error fetching projects:", error);
        return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }
}
