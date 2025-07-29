
import { NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, Timestamp, addDoc, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const role = searchParams.get('role');
  const projectId = searchParams.get('projectId');
  const groupId = searchParams.get('groupId');
  const sortBy = searchParams.get('sortBy');
  const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;
  
  // For calendar view
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    let q = query(collection(db, 'tasks'));
    let constraints = [];

    if (projectId) {
      constraints.push(where('projectId', '==', projectId));
    } else if (groupId) {
      constraints.push(where('groupId', '==', groupId));
    } else if (role !== 'admin') {
      constraints.push(where('assignees', 'array-contains-any', [{id: userId}]));
    }

    if (startDate && endDate) {
        constraints.push(where('dueDate', '>=', startDate));
        constraints.push(where('dueDate', '<', endDate));
    }

    if (sortBy && sortOrder) {
        constraints.push(orderBy(sortBy, sortOrder));
    } else {
        constraints.push(orderBy('createdAt', 'desc'));
    }

    if(constraints.length > 0) {
        q = query(collection(db, 'tasks'), ...constraints);
    }
    
    const querySnapshot = await getDocs(q);
    const tasks = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to serializable format
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        dueDate: data.dueDate,
        submissions: (data.submissions || []).map((s: any) => ({
            ...s,
            submittedAt: s.submittedAt instanceof Timestamp ? s.submittedAt.toDate().toISOString() : s.submittedAt,
        }))
      };
    });
    
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks: ', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const docRef = await addDoc(collection(db, 'tasks'), {
            ...body,
            createdAt: new Date(),
        });
        return NextResponse.json({ id: docRef.id, ...body }, { status: 201 });
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { taskId, submission, newStatus } = body;

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const taskRef = doc(db, 'tasks', taskId);
        const updates: any = {};

        if (submission) {
            updates.submissions = arrayUnion(submission);
        }
        if (newStatus) {
            updates.status = newStatus;
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
        }

        await updateDoc(taskRef, updates);

        return NextResponse.json({ message: 'Task updated successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        await deleteDoc(doc(db, 'tasks', taskId));

        return NextResponse.json({ message: 'Task deleted successfully' }, { status: 200 });

    } catch (error) {
        console.error('Error deleting task:', error);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
