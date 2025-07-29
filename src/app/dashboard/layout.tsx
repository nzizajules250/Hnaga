
'use client';

import { useAuth } from '@/context/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
  SidebarInset
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Home, ListTodo, Search, Bell, Circle, Plus, ChevronDown, MessageSquare, Users, Settings, LayoutDashboard, Briefcase, Video } from 'lucide-react';
import { Logo } from '@/components/logo';
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { collection, onSnapshot, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { usePathname } from 'next/navigation';

type Project = {
  id: string;
  name: string;
  color: string;
};

type Notification = {
    id: string;
    text: string;
    createdAt: Timestamp;
    isRead: boolean;
    context?: {
      type: 'message' | 'video-call';
      conversationId?: string;
      groupId?: string;
    }
};

const NotificationListener = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const [lastNotifTimestamp, setLastNotifTimestamp] = useState<Timestamp | null>(null);
    const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

    useEffect(() => {
        if (!user) return;

        const initialQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        getDocs(initialQuery).then(snapshot => {
            if (!snapshot.empty) {
                setLastNotifTimestamp(snapshot.docs[0].data().createdAt as Timestamp);
            }
            setIsInitialFetchDone(true);
        });
    }, [user]);

    useEffect(() => {
        if (!user || !isInitialFetchDone) return;

        const notificationsQuery = lastNotifTimestamp 
            ? query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                where('createdAt', '>', lastNotifTimestamp)
              )
            : query(
                collection(db, 'notifications'),
                where('userId', '==', user.uid),
                orderBy('createdAt', 'desc'),
                limit(1)
              );
        
        const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const newNotif = { id: change.doc.id, ...change.doc.data() } as Notification;
                    
                    if (lastNotifTimestamp && newNotif.createdAt.toMillis() <= lastNotifTimestamp.toMillis()) {
                        return;
                    }
                    
                    const newTimestamp = newNotif.createdAt;
                    setLastNotifTimestamp(newTimestamp);

                    if (newNotif.context?.type === 'message') {
                        const isGroupChat = pathname.includes('/dashboard/groups/');
                        const isDirectMessage = pathname.includes('/dashboard/messages');

                        if (isGroupChat || isDirectMessage) {
                           return; 
                        }
                    }

                     if (newNotif.context?.type === 'video-call' && newNotif.context.groupId) {
                        const { groupId } = newNotif.context;
                         if(pathname === `/dashboard/video/${groupId}`) {
                             return;
                         }

                        toast({
                            title: "Video Call Started",
                            description: newNotif.text,
                            action: (
                                <ToastAction 
                                    altText="Join Call" 
                                    onClick={() => router.push(`/dashboard/video/${groupId}`)}
                                >
                                    <Video className="mr-2 h-4 w-4" />
                                    Join Call
                                </ToastAction>
                            )
                        });
                        return;
                     }


                    toast({
                        title: "New Notification",
                        description: newNotif.text,
                    });
                }
            });
        });

        return () => unsubscribe();

    }, [user, toast, lastNotifTimestamp, isInitialFetchDone, pathname, router]);

    return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreateTaskOpen, setCreateTaskOpen] = useState(false);
  const [isCreateProjectOpen, setCreateProjectOpen] = useState(false);
  const [activePage, setActivePage] = useState('Home');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !userProfile) return;
    
    const fetchProjects = async () => {
        try {
            const response = await fetch(`/api/projects?userId=${user.uid}&role=${userProfile.role}`);
            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }
            const data = await response.json();
            setProjects(data);
        } catch(error) {
            console.error(error);
            toast({ title: "Error", description: "Could not load projects." });
        }
    }

    fetchProjects();

  }, [user, userProfile, toast]);

  if (loading || !user || !userProfile) {
    return null; // Or a loading spinner
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleNavigation = (page: string) => {
    setActivePage(page);
  };
  
  const isAdmin = userProfile.role === 'admin';

  return (
    <SidebarProvider>
        <NotificationListener />
        <Sidebar variant="sidebar" side="left" collapsible="icon">
          <SidebarContent className="p-0 flex flex-col">
            <SidebarHeader className="p-4 border-b-0">
              <Logo />
            </SidebarHeader>
            <SidebarMenu className="p-2">
              {isAdmin ? (
                <>
                  <SidebarMenuItem onClick={() => handleNavigation('Overview')}>
                     <Link href="/dashboard">
                        <SidebarMenuButton tooltip="Overview" isActive={activePage === 'Overview'}>
                        <Home />
                        <span className="group-data-[collapsible=icon]:hidden">Overview</span>
                        </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                  <SidebarMenuItem onClick={() => handleNavigation('All Items')}>
                     <Link href="/dashboard/all">
                        <SidebarMenuButton tooltip="All Items" isActive={activePage === 'All Items'}>
                        <LayoutDashboard />
                        <span className="group-data-[collapsible=icon]:hidden">All Items</span>
                        </SidebarMenuButton>
                     </Link>
                  </SidebarMenuItem>
                </>
              ) : (
                 <SidebarMenuItem onClick={() => handleNavigation('Client View')}>
                   <Link href="/dashboard/client">
                      <SidebarMenuButton tooltip="Client View" isActive={activePage === 'Client View'}>
                      <Briefcase />
                      <span className="group-data-[collapsible=icon]:hidden">Client View</span>
                      </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              )}
             
              <SidebarMenuItem onClick={() => handleNavigation('My Tasks')}>
                 <Link href="/dashboard/tasks">
                    <SidebarMenuButton tooltip="My Tasks" isActive={activePage === 'My Tasks'}>
                    <ListTodo />
                    <span className="group-data-[collapsible=icon]:hidden">My Tasks</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
              <SidebarMenuItem onClick={() => handleNavigation('Messages')}>
                 <Link href="/dashboard/messages">
                    <SidebarMenuButton tooltip="Messages" isActive={activePage === 'Messages'}>
                    <MessageSquare />
                    <span className="group-data-[collapsible=icon]:hidden">Messages</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
               <SidebarMenuItem onClick={() => handleNavigation('Groups')}>
                 <Link href="/dashboard/groups">
                    <SidebarMenuButton tooltip="Groups" isActive={activePage === 'Groups'}>
                    <Users />
                    <span className="group-data-[collapsible=icon]:hidden">Groups</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
              <SidebarMenuItem onClick={() => handleNavigation('Notifications')}>
                 <Link href="/dashboard/notifications">
                    <SidebarMenuButton tooltip="Notifications" isActive={activePage === 'Notifications'}>
                    <Bell />
                    <span className="group-data-[collapsible=icon]:hidden">Notifications</span>
                    </SidebarMenuButton>
                 </Link>
              </SidebarMenuItem>
               <SidebarMenuItem onClick={() => handleNavigation('Settings')}>
                 <Link href="/dashboard/settings">
                    <SidebarMenuButton tooltip="Settings" isActive={activePage === 'Settings'}>
                    <Settings />
                    <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>

            {isAdmin && (
                <div className="mt-4 px-4 py-2 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">projects</h3>
                  </div>
                  <Button variant="outline" className="w-full mt-2 justify-between group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:p-2" onClick={() => setCreateProjectOpen(true)}>
                    <span className="group-data-[collapsible=icon]:hidden">Add new</span>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
            )}
            
            <SidebarMenu className="p-2 flex-1 overflow-y-auto">
               {projects.map(project => (
                 <SidebarMenuItem key={project.id} onClick={() => handleNavigation(project.name)}>
                    <Link href={`/dashboard/projects/${project.id}`}>
                        <SidebarMenuButton tooltip={project.name} isActive={activePage === project.name}>
                        <Circle className="h-3 w-3" style={{ fill: project.color, stroke: project.color }} />
                        <span className="group-data-[collapsible=icon]:hidden">{project.name}</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
               ))}
            </SidebarMenu>
          <SidebarFooter className="p-2 mt-auto border-t">
             {isAdmin && (
                <Link href="/dashboard/all" className='w-full'>
                    <Button variant="ghost" className="w-full justify-center">
                        <span className="group-data-[collapsible=icon]:hidden">See all</span>
                        <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                </Link>
             )}
              <Button onClick={handleLogout} variant="destructive" className="w-full mt-2">
                <span className="group-data-[collapsible=icon]:hidden">Logout</span>
              </Button>
          </SidebarFooter>
        </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <header className="flex h-16 items-center gap-4 border-b bg-transparent px-6">
                <SidebarTrigger className="md:hidden" />
                <div className="flex-1">
                  <h1 className="text-2xl font-semibold">{activePage}</h1>
                </div>
                <div className="flex items-center gap-4">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  {isAdmin && (
                    <Button variant="default" size="sm" onClick={() => setCreateTaskOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Task
                    </Button>
                  )}
                </div>
            </header>
            <main className="flex-1 overflow-auto p-6">
                 {children}
            </main>
        </SidebarInset>
        {isAdmin && <CreateTaskDialog open={isCreateTaskOpen} onOpenChange={setCreateTaskOpen} />}
        {isAdmin && <CreateProjectDialog open={isCreateProjectOpen} onOpenChange={setCreateProjectOpen} />}
    </SidebarProvider>
  );
}
