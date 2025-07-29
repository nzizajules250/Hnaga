
'use client';

import React, { useEffect, useState } from 'react';
import { doc, updateDoc, addDoc, serverTimestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, MessageSquare, Link as LinkIcon, CheckCircle2, Pencil, Star, Trash2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { EditTaskDialog } from './edit-task-dialog';


export type TaskStatus = 'To Do' | 'In progress' | 'In Review' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export type Assignee = { 
  id: string; 
  name: string; 
  avatarUrl: string 
}

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees?: Assignee[];
  dueDate?: string;
  progress?: number;
  comments?: number;
  links?: number;
  code: string;
  category: string;
  userId: string; // Creator of the task
  submittable: boolean;
  submissions?: { userId: string; userName: string; submittedAt: Date }[];
  groupId?: string;
  projectId?: string;
  grade?: string;
};

const priorityVariant: { [key in TaskPriority]: "destructive" | "secondary" | "default" } = {
  'High': 'destructive',
  'Medium': 'secondary',
  'Low': 'default'
}

const SortableTaskCard = ({ task, onDelete }: { task: Task, onDelete: (taskId: string) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.8 : 1,
  };
  
  const progress = task.status === 'Done' ? 100 : (task.progress || 0);
  const progressColor = progress === 100 ? "bg-green-500" : "bg-primary";

  const isAssignee = task.assignees?.some(a => a.id === user?.uid);
  const hasSubmitted = task.submissions?.some(s => s.userId === user?.uid);
  const canEdit = userProfile?.role === 'admin' || user?.uid === task.userId;
  const isAdmin = userProfile?.role === 'admin';


  const handleSubmission = async () => {
      if (!user) return;
      try {
          const taskRef = doc(db, 'tasks', task.id);
          const submissionData = {
              userId: user.uid,
              userName: user.displayName || 'Anonymous',
              submittedAt: new Date(),
          };
          
          await updateDoc(taskRef, {
              submissions: [...(task.submissions || []), submissionData],
              status: 'In progress' // Move to In progress on submission
          });

          // Notify the task creator (admin)
          await addDoc(collection(db, 'notifications'), {
            userId: task.userId,
            text: `${user.displayName} has submitted their work for the task: "${task.title}"`,
            createdAt: serverTimestamp(),
            isRead: false,
          });

          toast({ title: 'Work submitted successfully!'});
      } catch (error) {
          console.error("Error submitting work: ", error);
          toast({ title: 'Error submitting work', variant: 'destructive'});
      }
  }

  const handleDelete = async () => {
    try {
        const response = await fetch(`/api/tasks?taskId=${task.id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error('Failed to delete task');
        }
        toast({ title: "Task deleted successfully" });
        onDelete(task.id);
    } catch(error) {
        console.error("Error deleting task:", error);
        toast({ title: "Error deleting task", variant: 'destructive' });
    }
  }

  return (
    <>
    <div ref={setNodeRef} style={style}>
      <Card className="mb-4 bg-card/80 backdrop-blur-sm shadow-sm" >
        <CardContent className="p-4 space-y-3">
           <div {...attributes} {...listeners}>
            <div className="flex justify-between items-start">
                <div className='space-x-2'>
                <Badge variant={priorityVariant[task.priority]} className="capitalize">{task.priority}</Badge>
                <Badge variant="outline">{task.category}</Badge>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{task.code}</span>
            </div>

            <h3 className="font-semibold text-base leading-tight">{task.title}</h3>
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
          
          {task.grade && (
            <div className="flex items-center gap-2 text-sm text-yellow-500 pt-2">
                <Star className="h-4 w-4 fill-yellow-500" />
                <strong>Grade:</strong> {task.grade}
            </div>
           )}

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className='text-sm font-medium'>Progress</span>
              <span className="text-sm font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} indicatorClassName={progressColor} />
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex -space-x-2">
                <TooltipProvider>
                    {task.assignees?.map((assignee, index) => (
                        <Tooltip key={index}>
                            <TooltipTrigger asChild>
                                <Avatar className="h-7 w-7 border-2 border-background">
                                    <AvatarImage src={assignee.avatarUrl} />
                                    <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{assignee.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </TooltipProvider>
            </div>
            <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">{task.comments || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                    <LinkIcon className="h-4 w-4" />
                    <span className="text-sm">{task.links || 0}</span>
                </div>
            </div>
          </div>
          {task.submissions && task.submissions.length > 0 && user?.uid === task.userId && (
              <div className="pt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Submissions:</h4>
                  <div className="flex flex-wrap gap-1">
                      {task.submissions.map(sub => (
                           <Badge key={sub.userId} variant="secondary">{sub.userName}</Badge>
                      ))}
                  </div>
              </div>
          )}
        </CardContent>
        <CardFooter className="p-2 border-t flex gap-2">
            {task.submittable && isAssignee && (
                    <Button 
                        className="w-full" 
                        variant={hasSubmitted ? "secondary" : "default"}
                        size="sm"
                        onClick={handleSubmission}
                        disabled={hasSubmitted}
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4"/>
                        {hasSubmitted ? 'Work Submitted' : 'Submit Work'}
                    </Button>
            )}
             {canEdit && (
                <Button 
                    className="w-full" 
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditDialogOpen(true)}
                >
                    <Pencil className="mr-2 h-4 w-4"/>
                    Edit Task
                </Button>
             )}
             {isAdmin && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            className="w-full" 
                            variant="destructive"
                            size="sm"
                        >
                            <Trash2 className="mr-2 h-4 w-4"/>
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task
                             and all its associated data.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
             )}
        </CardFooter>
      </Card>
    </div>
    {canEdit && <EditTaskDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} task={task} />}
    </>
  );
};

const TaskColumn = ({ title, tasks, id, onDelete }: { title: string; tasks: Task[]; id: TaskStatus; onDelete: (taskId: string) => void; }) => {
  return (
    <div className="flex-1 rounded-xl bg-muted/40 p-1 md:p-2">
      <div className="flex justify-between items-center p-3 mb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">{title}</h2>
          <Badge variant="secondary" className="rounded-full">{tasks.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>
       <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4 px-2 h-full overflow-y-auto">
          {tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};

export default function BoardView({ groupId, projectId }: { groupId?: string, projectId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchTasks = async () => {
        if (!user || !userProfile) return;
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                userId: user.uid,
                role: userProfile.role,
            });

            if (projectId) {
                queryParams.set('projectId', projectId);
            } else if (groupId) {
                queryParams.set('groupId', groupId);
            }

            const response = await fetch(`/api/tasks?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }
            const data = await response.json();
            setTasks(data);
        } catch (error) {
            console.error(error);
            toast({ title: 'Error fetching tasks', variant: 'destructive'});
        } finally {
            setLoading(false);
        }
    }
    fetchTasks();
  }, [user, userProfile, groupId, projectId, toast]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = columns.find(c => c.id === over.id) ? over.id as TaskStatus : findContainer(over.id as string);

    const activeId = active.id as string;
    const overId = over.id as string;
    
    const task = tasks.find(t => t.id === activeId);
    if (!task) return;

    if (activeContainer !== overContainer && overContainer) {
        const newStatus = overContainer as TaskStatus;
        const taskRef = doc(db, 'tasks', activeId);
        
        let newProgress = task.progress || 0;
        if (newStatus === 'Done') newProgress = 100;
        else if (newStatus === 'To Do') newProgress = 0;
        else if (newStatus === 'In progress' && newProgress === 0) newProgress = 10;
        
        await updateDoc(taskRef, { status: newStatus, progress: newProgress });
        
        setTasks(tasks => {
            const oldIndex = tasks.findIndex(t => t.id === activeId);
            const newTasks = [...tasks];
            newTasks[oldIndex] = { ...newTasks[oldIndex], status: newStatus, progress: newProgress };
            
            const overIndex = tasks.findIndex(t => t.id === overId);
            if (overIndex !== -1) {
              return arrayMove(newTasks, oldIndex, overIndex);
            }
            return newTasks;
        });
    } else if (activeId !== overId) {
        setTasks((items) => {
            const oldIndex = items.findIndex((item) => item.id === activeId);
            const newIndex = items.findIndex((item) => item.id === overId);
            if (oldIndex === -1 || newIndex === -1) return items;
            return arrayMove(items, oldIndex, newIndex);
        });
    }
  };
  
  const handleDeleteTask = (taskId: string) => {
    setTasks(currentTasks => currentTasks.filter(task => task.id !== taskId));
  }

  const columns: { id: TaskStatus; title: string }[] = [
    { id: 'To Do', title: 'To Do' },
    { id: 'In progress', title: 'In progress' },
    { id: 'In Review', title: 'In Review' },
    { id: 'Done', title: 'Done' },
  ];

  const findContainer = (id: string) => {
     if (columns.find(c => c.id === id)) return id as TaskStatus;
     const task = tasks.find(t => t.id === id);
     return task?.status || null;
  };
  
  const getTasksForColumn = (status: TaskStatus) => tasks.filter(t => t.status === status);

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
          {columns.map(column => (
            <TaskColumn 
                key={column.id} 
                id={column.id} 
                title={column.title} 
                tasks={getTasksForColumn(column.id)} 
                onDelete={handleDeleteTask}
            />
          ))}
      </div>
    </DndContext>
  );
}
