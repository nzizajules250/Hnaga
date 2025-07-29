
'use client';

import { useEffect, useState } from 'react';
import { updateDoc, arrayUnion, addDoc, serverTimestamp, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useParams } from 'next/navigation';
import { Circle, UserPlus } from 'lucide-react';
import TasksPage from '../../tasks/page';
import { useAuth } from '@/context/auth-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Project = {
  id: string;
  name: string;
  color: string;
  members: string[]; // array of UIDs
};

type User = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

function AssignUserDialog({ project, users, open, onOpenChange }: { project: Project | null, users: User[], open: boolean, onOpenChange: (open: boolean) => void }) {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [popoverOpen, setPopoverOpen] = useState(false);
    const { toast } = useToast();

    // Guard against project or project.members being null/undefined
    const availableUsers = project?.members ? users.filter(u => !project.members.includes(u.uid)) : users;

    const handleAssignUsers = async () => {
        if (selectedUsers.length === 0 || !project) return;

        try {
            const projectRef = doc(db, 'projects', project.id);
            await updateDoc(projectRef, {
                members: arrayUnion(...selectedUsers)
            });

            const notificationPromises = selectedUsers.map(userId => {
                return addDoc(collection(db, 'notifications'), {
                    userId: userId,
                    text: `You have been assigned to the project: "${project.name}"`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                });
            });
            await Promise.all(notificationPromises);
            
            toast({ title: 'Users assigned successfully!' });
            onOpenChange(false);
            setSelectedUsers([]);

        } catch (error) {
            console.error("Error assigning users: ", error);
            toast({ title: 'Error assigning users', variant: 'destructive' });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign Users to {project?.name}</DialogTitle>
                    <DialogDescription>Select users to add to this project.</DialogDescription>
                </DialogHeader>
                 <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                         <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpen}
                            className="w-full justify-between"
                            >
                            {selectedUsers.length > 0
                                ? `${selectedUsers.length} user(s) selected`
                                : "Select users..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search users..." />
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup>
                            <ScrollArea className="h-48">
                                {availableUsers.map((u) => (
                                     <CommandItem
                                        key={u.uid}
                                        value={u.displayName}
                                        onSelect={() => {
                                            const isSelected = selectedUsers.includes(u.uid);
                                            if (isSelected) {
                                                setSelectedUsers(selectedUsers.filter(id => id !== u.uid));
                                            } else {
                                                setSelectedUsers([...selectedUsers, u.uid]);
                                            }
                                        }}
                                     >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedUsers.includes(u.uid) ? "opacity-100" : "opacity-0"
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
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAssignUsers} disabled={selectedUsers.length === 0}>Assign Users</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { userProfile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isAssignUserOpen, setAssignUserOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjectAndUsers = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            // Fetch project details
            const response = await fetch(`/api/projects?id=${projectId}`);
            if (!response.ok) throw new Error('Failed to fetch project');
            const projectData = await response.json();
            setProject(projectData);

            // Fetch users if admin
            if (userProfile?.role === 'admin') {
                const usersResponse = await fetch('/api/users');
                if (!usersResponse.ok) throw new Error('Failed to fetch users');
                const usersData = await usersResponse.json();
                setAllUsers(usersData);
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error loading project data', variant: 'destructive'});
        } finally {
            setLoading(false);
        }
    }
    fetchProjectAndUsers();
  }, [projectId, userProfile?.role, toast]);

  if (loading) {
    return <div>Loading project...</div>;
  }

  if (!project) {
    return <div>Project not found.</div>;
  }

  const isAdmin = userProfile?.role === 'admin';

  return (
    <div>
        <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
                <Circle className="h-4 w-4" style={{ fill: project.color, stroke: project.color }} />
                <h1 className="text-2xl font-bold">{project.name}</h1>
            </div>
            {isAdmin && (
                <Button onClick={() => setAssignUserOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Assign User
                </Button>
            )}
        </div>
        <TasksPage projectId={projectId} />

        {isAdmin && (
            <AssignUserDialog 
                project={project}
                users={allUsers}
                open={isAssignUserOpen}
                onOpenChange={setAssignUserOpen}
            />
        )}
    </div>
  );
}
