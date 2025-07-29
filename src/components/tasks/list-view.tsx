
'use client';

import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Task } from './board-view';
import { useAuth } from '@/context/auth-provider';

const priorityVariant: { [key in Task['priority']]: "destructive" | "secondary" | "default" } = {
  'High': 'destructive',
  'Medium': 'secondary',
  'Low': 'default'
}

const statusBadge: { [key in Task['status']]: string } = {
    'To Do': 'bg-blue-500/20 text-blue-500',
    'In progress': 'bg-yellow-500/20 text-yellow-500',
    'In Review': 'bg-purple-500/20 text-purple-500',
    'Done': 'bg-green-500/20 text-green-500'
}

export default function ListView({ projectId }: { projectId?: string }) {
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
                role: 'user', // Simplified for now, can be dynamic
            });

            if (projectId) {
                queryParams.set('projectId', projectId);
            }

            const response = await fetch(`/api/tasks?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }
    fetchTasks();
  }, [user, projectId]);

  if (loading) {
    return <div>Loading tasks...</div>;
  }
  
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]">
              <Checkbox />
            </TableHead>
            <TableHead className="w-[80px]">Code</TableHead>
            <TableHead>Task</TableHead>
            <TableHead className="w-[120px]">Status</TableHead>
            <TableHead className="w-[120px]">Priority</TableHead>
            <TableHead className="w-[150px]">Due Date</TableHead>
            <TableHead className="w-[150px]">Assignees</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <Checkbox />
              </TableCell>
              <TableCell className="font-medium text-muted-foreground">{task.code}</TableCell>
              <TableCell className="font-semibold">{task.title}</TableCell>
              <TableCell>
                 <Badge variant="outline" className={`border-0 ${statusBadge[task.status]}`}>{task.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={priorityVariant[task.priority]} className="capitalize">{task.priority}</Badge>
              </TableCell>
              <TableCell>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell>
                <div className="flex -space-x-2">
                  {task.assignees?.map((assignee, index) => (
                    <Avatar key={index} className="h-7 w-7 border-2 border-background">
                      <AvatarImage src={assignee.avatarUrl} />
                      <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
