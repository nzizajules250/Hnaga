
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, ListTodo, Clock, CheckCircle, BarChart, Circle } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

type Task = {
  id: string;
  status: string;
  dueDate?: string;
  assignees?: { id: string }[];
  projectId?: string;
};

type Project = {
    id: string;
    name: string;
    color: string;
};

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const assignedTasksQuery = query(collection(db, 'tasks'), where('assignees', 'array-contains-any', [{id: user.uid, name: user.displayName, avatarUrl: user.photoURL || ''}]));
    
    const unsubscribe = onSnapshot(assignedTasksQuery, async (snapshot) => {
        const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(taskList);

        const projectIds = [...new Set(taskList.map(task => task.projectId).filter(Boolean))];
        if (projectIds.length > 0) {
            const projectsQuery = query(collection(db, 'projects'), where('__name__', 'in', projectIds));
            const projectsSnapshot = await getDocs(projectsQuery);
            const projectList = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
            setProjects(projectList);
        } else {
            setProjects([]);
        }

        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const isDueSoon = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return due >= today && due <= sevenDaysFromNow;
  };

  const clientData = {
    activeProjects: projects.length,
    pendingTasks: tasks.filter(t => t.status !== 'Done').length,
    dueSoon: tasks.filter(t => t.dueDate && isDueSoon(t.dueDate) && t.status !== 'Done').length,
    completedTasks: tasks.filter(t => t.status === 'Done').length,
  };

  if (loading) {
      return <div>Loading client dashboard...</div>
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-2">
            <Briefcase className="h-8 w-8" />
            Client Dashboard
        </h2>
      </div>
      <p className="text-muted-foreground">
        A simplified overview of your projects and tasks.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientData.activeProjects}</div>
            <p className="text-xs text-muted-foreground">Projects you are involved in.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientData.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Tasks assigned to you.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientData.dueSoon}</div>
            <p className="text-xs text-muted-foreground">Tasks due in the next 7 days.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientData.completedTasks}</div>
            <p className="text-xs text-muted-foreground">Tasks you have completed.</p>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
              <CardTitle>Assigned Projects</CardTitle>
              <CardDescription>A list of projects you have been assigned tasks in.</CardDescription>
          </CardHeader>
          <CardContent>
              {projects.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map(project => (
                    <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                      <Card className="hover:shadow-lg transition-shadow">
                          <CardHeader className="flex flex-row items-center gap-3">
                              <Circle className="h-4 w-4" style={{ fill: project.color, stroke: project.color }} />
                              <CardTitle className="text-lg">{project.name}</CardTitle>
                          </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <p>You are not yet part of any projects.</p>
                </div>
              )}
          </CardContent>
      </Card>

    </div>
  );
}
