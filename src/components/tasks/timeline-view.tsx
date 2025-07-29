
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GanttChartSquare, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Task } from './board-view';
import { useAuth } from '@/context/auth-provider';

const priorityClasses: {[key in Task['priority']]: string} = {
  High: 'bg-red-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-blue-500',
};

const statusBadge: { [key in Task['status']]: string } = {
    'To Do': 'bg-blue-500/20 text-blue-500',
    'In progress': 'bg-yellow-500/20 text-yellow-500',
    'In Review': 'bg-purple-500/20 text-purple-500',
    'Done': 'bg-green-500/20 text-green-500'
}

export default function TimelineView({ projectId }: { projectId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTasks = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                userId: user.uid,
                role: 'admin', // Timeline is likely an admin view
                sortBy: 'dueDate',
                sortOrder: 'asc',
            });
            if (projectId) {
                queryParams.set('projectId', projectId);
            }
            const response = await fetch(`/api/tasks?${queryParams.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch tasks');
            const data = await response.json();
            setTasks(data.filter((task: Task) => task.dueDate));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }
    fetchTasks();
  }, [user, projectId]);

  if (loading) {
    return <div>Loading timeline...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GanttChartSquare /> Project Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative pl-6">
          {/* Vertical line */}
          <div className="absolute left-9 top-0 bottom-0 w-0.5 bg-border"></div>
          
          <div className="space-y-8">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="h-6 w-6 rounded-full bg-background border-2 border-primary flex items-center justify-center absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10">
                       <Circle className={`h-2.5 w-2.5 ${priorityClasses[task.priority]}`} fill={priorityClasses[task.priority]} />
                    </div>
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(task.dueDate!), 'MMMM d, yyyy')}
                  </p>
                  <h4 className="font-semibold">{task.title}</h4>
                   <Badge variant="outline" className={`mt-1 border-0 ${statusBadge[task.status]}`}>{task.status}</Badge>
                </div>
              </div>
            ))}
             {tasks.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-10">
                    <p>No tasks with due dates to display on the timeline.</p>
                </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
