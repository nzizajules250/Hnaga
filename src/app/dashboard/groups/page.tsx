
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, doc, getDocs, query, where, updateDoc, arrayUnion, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/auth-provider';
import { Users, Plus, UserPlus, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import Link from 'next/link';

type User = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
};

type Group = {
  id: string;
  name: string;
  members: User[];
  memberUIDs: string[];
  createdBy: string;
};

function AddMemberDialog({ group, users, open, onOpenChange }: { group: Group, users: User[], open: boolean, onOpenChange: (open: boolean) => void }) {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const { toast } = useToast();

    const availableUsers = users.filter(u => !group.memberUIDs.includes(u.uid) && u.displayName.toLowerCase() !== 'ckient');

    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) return;

        try {
            const groupRef = doc(db, 'groups', group.id);
            await updateDoc(groupRef, {
                memberUIDs: arrayUnion(...selectedUsers)
            });

            const notificationPromises = selectedUsers.map(userId => {
                return addDoc(collection(db, 'notifications'), {
                    userId: userId,
                    text: `You have been added to the group: "${group.name}"`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                });
            });
            await Promise.all(notificationPromises);
            
            toast({ title: 'Members added successfully!' });
            onOpenChange(false);
            setSelectedUsers([]);

        } catch (error) {
            console.error("Error adding members: ", error);
            toast({ title: 'Error adding members', variant: 'destructive' });
        }
    };
    
     const handleUserSelection = (userId: string) => {
        setSelectedUsers(prev => 
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Members to {group.name}</DialogTitle>
                    <DialogDescription>Select users to add to this group.</DialogDescription>
                </DialogHeader>
                 <div className="py-4">
                    <ScrollArea className="h-48 rounded-md border p-2">
                        {availableUsers.map((u) => (
                            <div key={u.id} className="flex items-center space-x-2 p-1">
                                <Checkbox
                                    id={`add-${u.uid}`}
                                    checked={selectedUsers.includes(u.uid)}
                                    onCheckedChange={() => handleUserSelection(u.uid)}
                                />
                                <Label htmlFor={`add-${u.uid}`} className="flex items-center gap-2 font-normal w-full">
                                    <Avatar className="h-6 w-6">
                                    <AvatarImage src={u.avatarUrl} />
                                    <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span>{u.displayName}</span>
                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                    </div>
                                </Label>
                            </div>
                        ))}
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleAddMembers} disabled={selectedUsers.length === 0}>Add Members</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function CreateGroupDialog({ users, onGroupCreated }: { users: User[], onGroupCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !user) return;

    const finalSelectedUsers = selectedUsers.includes(user.uid) ? selectedUsers : [...selectedUsers, user.uid];

    try {
      const response = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              name: groupName,
              memberUIDs: finalSelectedUsers,
              createdBy: user.uid,
          })
      });
      if (!response.ok) throw new Error('Failed to create group');

      toast({ title: 'Group created successfully!' });
      onGroupCreated();
      setOpen(false);
      setGroupName('');
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error creating group:', error);
      toast({ title: 'Error creating group', variant: 'destructive' });
    }
  };
  
  const handleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const availableUsers = users.filter(u => u.displayName.toLowerCase() !== 'ckient' && u.uid !== user?.uid);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Group</DialogTitle>
          <DialogDescription>Fill in the details below to create a new group.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="col-span-3"
              placeholder="Group Name"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label className="text-right">
              Members
            </Label>
            <div className="col-span-3">
              <ScrollArea className="h-48 rounded-md border p-2">
                {availableUsers.map((u) => (
                     <div key={u.id} className="flex items-center space-x-2 p-1">
                      <Checkbox
                        id={u.uid}
                        checked={selectedUsers.includes(u.uid)}
                        onCheckedChange={() => handleUserSelection(u.uid)}
                      />
                      <Label htmlFor={u.uid} className="flex items-center gap-2 font-normal">
                         <Avatar className="h-6 w-6">
                          <AvatarImage src={u.avatarUrl} />
                          <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {u.displayName}
                      </Label>
                    </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleCreateGroup}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GroupCard({ group, allUsers }: { group: Group, allUsers: User[] }) {
    const [isCreateTaskOpen, setCreateTaskOpen] = useState(false);
    const [isAddMemberOpen, setAddMemberOpen] = useState(false);
    const { userProfile } = useAuth();

    return (
        <>
            <Card>
                <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <Link href={`/dashboard/groups/${group.id}`} className='flex items-center gap-2 hover:underline'>
                      <Users className="h-6 w-6" /> 
                      {group.name}
                    </Link>
                    {userProfile?.role === 'admin' && (
                        <Button variant="ghost" size="sm" onClick={() => setAddMemberOpen(true)}>
                            <UserPlus className="h-4 w-4 mr-2" /> Add Member
                        </Button>
                    )}
                </CardTitle>
                <CardDescription>{group.members.length} member(s)</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="flex -space-x-2 overflow-hidden">
                    {group.members.map((member) => (
                    <Avatar key={member.uid} className="inline-block h-8 w-8 rounded-full ring-2 ring-background">
                        <AvatarImage src={member.avatarUrl} />
                        <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    ))}
                </div>
                </CardContent>
                <CardFooter className='gap-2'>
                    {userProfile?.role === 'admin' && (
                        <Button variant="outline" className="w-full" onClick={() => setCreateTaskOpen(true)}>Assign Task</Button>
                    )}
                    <Button variant="default" className="w-full" asChild>
                      <Link href={`/dashboard/groups/${group.id}`}>Open Workspace <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                </CardFooter>
            </Card>
            <CreateTaskDialog 
                open={isCreateTaskOpen} 
                onOpenChange={setCreateTaskOpen}
                defaultAssignees={group.memberUIDs}
                groupId={group.id}
            />
            {userProfile?.role === 'admin' && (
              <AddMemberDialog 
                  group={group} 
                  users={allUsers}
                  open={isAddMemberOpen}
                  onOpenChange={setAddMemberOpen}
              />
            )}
        </>
    )
}

export default function GroupsPage() {
  const { user, userProfile } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchGroupsAndUsers = async () => {
      if (!user) return;
      setLoading(true);
      try {
          // Fetch all users first
          const usersResponse = await fetch('/api/users');
          if (!usersResponse.ok) throw new Error('Failed to fetch users');
          const usersData = await usersResponse.json();
          setUsers(usersData);
          
          // Then fetch groups for the current user
          const groupsResponse = await fetch(`/api/groups?userId=${user.uid}`);
          if (!groupsResponse.ok) throw new Error('Failed to fetch groups');
          const groupsData = await groupsResponse.json();
          
          // Hydrate group members
          const hydratedGroups = groupsData.map((group: any) => ({
              ...group,
              members: group.memberUIDs.map((uid: string) => usersData.find((u: User) => u.uid === uid)).filter(Boolean)
          }))
          setGroups(hydratedGroups);

      } catch (error) {
          console.error(error);
          toast({ title: 'Error loading groups', variant: 'destructive'});
      } finally {
          setLoading(false);
      }
  }

  useEffect(() => {
    fetchGroupsAndUsers();
  }, [user, toast]);

  if (loading) {
    return <div>Loading groups...</div>
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">
          Groups
        </h2>
        {userProfile?.role === 'admin' && <CreateGroupDialog users={users} onGroupCreated={fetchGroupsAndUsers} />}
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} allUsers={users} />
        ))}
      </div>
       {groups.length === 0 && !loading && (
          <div className="text-center text-muted-foreground mt-10">
            <p>No groups found. Create one to get started!</p>
          </div>
        )}
    </div>
  );
}
