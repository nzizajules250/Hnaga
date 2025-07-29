
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
// ...existing code...
// Remove Firebase imports
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Switch } from '../ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../ui/command';
import type { Task } from './board-view';
import { useAuth } from '@/context/auth-provider';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In progress', 'In Review', 'Done']),
  priority: z.enum(['Low', 'Medium', 'High']),
  dueDate: z.date().optional(),
  assignees: z.array(z.string()).optional(),
  category: z.string().min(1, 'Category is required'),
  submittable: z.boolean().default(false),
  grade: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

type User = {
  id: string;
  uid: string;
  displayName: string;
  avatarUrl?: string;
};

export function EditTaskDialog({ open, onOpenChange, task }: { open: boolean, onOpenChange: (open: boolean) => void, task: Task }) {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      assignees: task.assignees?.map(a => a.id) || [],
      category: task.category,
      submittable: task.submittable,
      grade: task.grade || '',
    },
  });

  useEffect(() => {
    form.reset({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      assignees: task.assignees?.map(a => a.id) || [],
      category: task.category,
      submittable: task.submittable,
      grade: task.grade || '',
    });
  }, [task, form]);

  useEffect(() => {
    // Fetch users from backend API
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const userList = await res.json();
          setUsers(userList);
        }
      } catch (err) {
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  const onSubmit = async (data: TaskFormValues) => {
    const assignedUserDetails = users.filter(u => data.assignees?.includes(u.id)).map(u => ({
      id: u.id,
      name: u.displayName,
      avatarUrl: u.avatarUrl || ''
    }));

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          assignees: assignedUserDetails,
          dueDate: data.dueDate ? format(data.dueDate, 'yyyy-MM-dd') : null,
        })
      });
      if (res.ok) {
        toast({ title: 'Task updated successfully!' });
        onOpenChange(false);
      } else {
        toast({ title: 'Error updating task', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: 'Error updating task', variant: 'destructive' });
    }
  };

  const isAdmin = userProfile?.role === 'admin';
  const isTaskDone = form.watch('status') === 'Done';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Make changes to your task here. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Design a new landing page" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add a more detailed description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Marketing, Development" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In progress">In progress</SelectItem>
                        <SelectItem value="In Review">In Review</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignees"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Assignees</FormLabel>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                             <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={popoverOpen}
                                className="w-full justify-between"
                                >
                                {field.value && field.value.length > 0
                                    ? `${field.value.length} user(s) selected`
                                    : "Select assignees..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Search users..." />
                                <CommandEmpty>No users found.</CommandEmpty>
                                <CommandGroup>
                                <ScrollArea className="h-48">
                                    {users.map((u) => (
                                         <CommandItem
                                            key={u.uid}
                                            value={u.displayName}
                                            onSelect={() => {
                                                const selected = field.value || [];
                                                const isSelected = selected.includes(u.uid);
                                                if (isSelected) {
                                                    field.onChange(selected.filter(id => id !== u.uid));
                                                } else {
                                                    field.onChange([...selected, u.uid]);
                                                }
                                            }}
                                         >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    field.value?.includes(u.uid) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                             <Avatar className="h-6 w-6 mr-2">
                                                <AvatarImage src={u.avatarUrl} />
                                                <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            {u.displayName}
                                         </CommandItem>
                                    ))}
                                    </ScrollArea>
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="submittable"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Enable Submissions</FormLabel>
                            <FormDescription>
                                Allow assignees to formally submit their completed work.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />

             {isAdmin && isTaskDone && (
                <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Grade / Feedback</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. A+ or Excellent work!" {...field} />
                        </FormControl>
                        <FormDescription>
                            Provide a grade or feedback for the completed task.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
             )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    