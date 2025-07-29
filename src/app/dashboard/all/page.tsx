
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Users, ListTodo, GanttChartSquare, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: string;
};

type Group = {
  id: string;
  name: string;
  memberUIDs: string[];
};

type Task = {
  id: string;
  title: string;
  status: string;
  priority: 'Low' | 'Medium' | 'High';
};

const priorityVariant: { [key in Task['priority']]: "destructive" | "secondary" | "default" } = {
  'High': 'destructive',
  'Medium': 'secondary',
  'Low': 'default'
};

const AnnouncementDialog = () => {
    const [open, setOpen] = useState(false);
    const [announcement, setAnnouncement] = useState('');
    const { toast } = useToast();
    const { user } = useAuth();

    const handleSendAnnouncement = async () => {
        if (!announcement.trim() || !user) return;

        try {
            // 1. Add to announcements collection (optional, but good for history)
            await addDoc(collection(db, 'announcements'), {
                text: announcement,
                authorId: user.uid,
                authorName: user.displayName,
                createdAt: serverTimestamp(),
            });

            // 2. Create notifications for all client users
            const usersQuery = query(collection(db, 'users'), where('role', '==', 'user'));
            const usersSnapshot = await getDocs(usersQuery);

            const notificationPromises = usersSnapshot.docs.map(userDoc => {
                return addDoc(collection(db, 'notifications'), {
                    userId: userDoc.data().uid,
                    text: `New Announcement: ${announcement}`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                });
            });

            await Promise.all(notificationPromises);

            toast({ title: 'Announcement sent successfully!' });
            setAnnouncement('');
            setOpen(false);
        } catch (error) {
            console.error("Error sending announcement: ", error);
            toast({ title: 'Error sending announcement', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Megaphone className="mr-2 h-4 w-4"/> Create Announcement
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create an Announcement</DialogTitle>
                    <DialogDescription>
                        This will send a notification to all client users.
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    value={announcement}
                    onChange={(e) => setAnnouncement(e.target.value)}
                    placeholder="Type your announcement here..."
                    rows={5}
                />
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSendAnnouncement} disabled={!announcement.trim()}>Send</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function AllItemsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [userProfile, router]);

  useEffect(() => {
    const unsubscribers = [
      onSnapshot(collection(db, 'users'), (snapshot) => {
        const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setUsers(userList);
        setLoading(false);
      }),
      onSnapshot(collection(db, 'groups'), (snapshot) => {
        const groupList = snapshot.docs.map(doc => ({ id: doc.id, memberUIDs: doc.data().members, ...doc.data() } as Group));
        setGroups(groupList);
        setLoading(false);
      }),
      onSnapshot(collection(db, 'tasks'), (snapshot) => {
        const taskList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(taskList);
        setLoading(false);
      }),
    ];

    return () => unsubscribers.forEach(unsub => unsub());
  }, []);

  if (loading || userProfile?.role !== 'admin') {
    return <div>Loading all items...</div>;
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">
          All Items
        </h2>
        {userProfile?.role === 'admin' && <AnnouncementDialog />}
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {/* Users Card */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><Users /> All Users</CardTitle>
            <CardDescription>A list of all registered users in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Groups Card */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><GanttChartSquare /> All Groups</CardTitle>
             <CardDescription>A list of all created groups.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map(group => (
                  <TableRow key={group.id}>
                    <TableCell className="font-semibold">{group.name}</TableCell>
                    <TableCell className="text-right">{group.memberUIDs?.length || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tasks Card */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className='flex items-center gap-2'><ListTodo /> All Tasks</CardTitle>
            <CardDescription>A list of all tasks across all projects.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(task => (
                  <TableRow key={task.id}>
                    <TableCell className="font-semibold">{task.title}</TableCell>
                    <TableCell><Badge variant="secondary">{task.status}</Badge></TableCell>
                    <TableCell><Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
