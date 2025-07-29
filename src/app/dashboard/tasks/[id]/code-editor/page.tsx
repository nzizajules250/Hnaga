
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import CodeEditor from '@/components/tasks/code-editor';
import { Task } from '@/components/tasks/board-view';

export default function CodeEditorPage() {
  const params = useParams();
  const taskId = params.id as string;
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;
    const taskDocRef = doc(db, 'tasks', taskId);
    const unsubscribe = onSnapshot(taskDocRef, (doc) => {
      if (doc.exists()) {
        setTask({ id: doc.id, ...doc.data() } as Task);
      } else {
        console.error('Task not found');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [taskId]);

  if (loading || !user) {
    return <div>Loading Code Editor...</div>;
  }

  if (!task) {
    return <div>Task not found.</div>;
  }

  return <CodeEditor task={task} />;
}
