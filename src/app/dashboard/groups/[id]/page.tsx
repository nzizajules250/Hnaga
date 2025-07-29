
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, collection, query, where, orderBy, addDoc, serverTimestamp, getDocs, DocumentData, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Users, Video, Check, CheckCheck, Paperclip, AtSign, Smile, Mic, MoreHorizontal, File, Pencil, Link as LinkIcon, ListTodo, CheckCircle2, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge';
import type { Task } from '@/components/tasks/board-view';
import Link from 'next/link';


type Group = {
  id: string;
  name: string;
  description?: string;
  memberUIDs: string[]; // array of uids
};

type Message = {
    id: string;
    text: string;
    senderId: string;
    createdAt: any;
    senderName?: string;
    senderAvatar?: string;
    readBy: string[];
};

type User = {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  isActive?: boolean;
};

const priorityVariant: { [key in Task['priority']]: "destructive" | "secondary" | "default" } = {
  'High': 'destructive',
  'Medium': 'secondary',
  'Low': 'default'
};


const GroupTaskItem = ({ task }: { task: Task }) => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const isAssignee = task.assignees?.some(a => a.id === user?.uid);
    const hasSubmitted = task.submissions?.some(s => s.userId === user?.uid);

    const handleSubmission = async () => {
        if (!user) return;
        try {
            const submissionData = {
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                submittedAt: new Date(),
            };

            const response = await fetch('/api/tasks', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    taskId: task.id, 
                    submission: submissionData,
                    newStatus: 'In progress'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit work');
            }
            
            await addDoc(collection(db, 'notifications'), {
                userId: task.userId,
                text: `${user.displayName} has submitted their work for: "${task.title}"`,
                createdAt: serverTimestamp(),
                isRead: false,
            });

            toast({ title: 'Work submitted successfully!'});
        } catch (error) {
            console.error("Error submitting work: ", error);
            toast({ title: 'Error submitting work', variant: 'destructive'});
        }
    }

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-background/50">
            <div className="flex justify-between items-start">
                <span className="font-semibold">{task.title}</span>
                <Badge variant={priorityVariant[task.priority]}>{task.priority}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{task.description}</p>
            {task.dueDate && <p className="text-xs text-muted-foreground">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
             <div className="flex items-center gap-2 mt-2">
                <Button asChild variant="default" size="sm" className="w-full">
                    <Link href={`/dashboard/tasks/${task.id}/code-editor`}>
                        <Code className="mr-2 h-4 w-4"/> Do the work
                    </Link>
                </Button>
                {task.submittable && isAssignee && (
                    <Button 
                        variant={hasSubmitted ? "secondary" : "default"}
                        size="sm"
                        onClick={handleSubmission}
                        disabled={hasSubmitted}
                        className="w-full"
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4"/>
                        {hasSubmitted ? 'Work Submitted' : 'Submit Work'}
                    </Button>
                )}
            </div>
        </div>
    )
}

const GroupDetail = ({ group, members }: { group: Group, members: User[] }) => {
    const onlineMembers = members.filter(m => m.isActive).length;
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        const tasksQuery = query(collection(db, 'tasks'), where('groupId', '==', group.id));
        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(tasksData);
        });
        return () => unsubscribe();
    }, [group.id]);


    // Sort members to show active ones first
    const sortedMembers = [...members].sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return a.displayName.localeCompare(b.displayName);
    });

    return (
        <Card className="h-full flex flex-col border-l rounded-none">
            <CardHeader className='border-b'>
                <CardTitle>Group Detail</CardTitle>
            </CardHeader>
            <ScrollArea>
                <CardContent className="p-6 space-y-6">
                    <div>
                        <Label>Name</Label>
                        <div className="flex justify-between items-center">
                            <p className="font-semibold text-lg">{group.name}</p>
                            <Button variant="ghost" size="icon"><Pencil className="h-4 w-4"/></Button>
                        </div>
                    </div>
                    <div>
                        <Label>Description</Label>
                         <div className="flex justify-between items-start">
                             <p className="text-muted-foreground">{group.description || 'No description provided.'}</p>
                             <Button variant="ghost" size="icon"><Pencil className="h-4 w-4"/></Button>
                         </div>
                    </div>

                    <Tabs defaultValue="tasks" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="tasks">Tasks</TabsTrigger>
                            <TabsTrigger value="files">Files</TabsTrigger>
                            <TabsTrigger value="links">Links</TabsTrigger>
                            <TabsTrigger value="media">Media</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tasks">
                           <div className="space-y-3 mt-4">
                                {tasks.length > 0 ? (
                                    tasks.map(task => <GroupTaskItem key={task.id} task={task} />)
                                ) : (
                                    <div className="text-center text-muted-foreground p-8">
                                        <ListTodo className="mx-auto h-10 w-10 mb-2"/>
                                        <p>No tasks assigned to this group yet.</p>
                                   </div>
                                )}
                           </div>
                        </TabsContent>
                        <TabsContent value="files">
                           <div className="text-center text-muted-foreground p-8">
                                <File className="mx-auto h-10 w-10 mb-2"/>
                                <p>No files shared yet.</p>
                           </div>
                        </TabsContent>
                         <TabsContent value="links">
                           <div className="text-center text-muted-foreground p-8">
                                <LinkIcon className="mx-auto h-10 w-10 mb-2"/>
                                <p>No links shared yet.</p>
                           </div>
                        </TabsContent>
                         <TabsContent value="media">
                           <div className="text-center text-muted-foreground p-8">
                                <Video className="mx-auto h-10 w-10 mb-2"/>
                                <p>No media shared yet.</p>
                           </div>
                        </TabsContent>
                    </Tabs>

                     <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">{members.length} Member(s)</h4>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                                    {onlineMembers} Online
                                </Badge>
                                <Button variant="ghost" size="icon"><Users className="h-4 w-4"/></Button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {sortedMembers.map(member => (
                                <div key={member.uid} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 relative">
                                            <AvatarImage src={member.photoURL}/>
                                            <AvatarFallback>{member.displayName.charAt(0)}</AvatarFallback>
                                            {member.isActive && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />}
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{member.displayName}</p>
                                            <p className={`text-xs ${member.isActive ? 'text-green-500' : 'text-muted-foreground'}`}>{member.isActive ? 'Active' : 'Away'}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </ScrollArea>
        </Card>
    );
};


const GroupChat = ({ group, currentUser }: { group: Group, currentUser: User }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const messagesQuery = query(collection(db, 'messages', group.id, 'chats'), orderBy('createdAt', 'asc'));

        const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
            const uniqueSenders = new Map<string, DocumentData>();
            const messagesData: Message[] = await Promise.all(snapshot.docs.map(async (messageDoc) => {
                const data = messageDoc.data();
                let senderData: DocumentData | undefined = uniqueSenders.get(data.senderId);

                if(!senderData) {
                    const userDocRef = query(collection(db, 'users'), where('uid', '==', data.senderId));
                    const userSnap = await getDocs(userDocRef);
                    if (!userSnap.empty) {
                        senderData = userSnap.docs[0].data();
                        uniqueSenders.set(data.senderId, senderData);
                    }
                }
                
                if (!(data.readBy || []).includes(currentUser.uid)) {
                    const messageRef = doc(db, 'messages', group.id, 'chats', messageDoc.id);
                    await updateDoc(messageRef, {
                        readBy: arrayUnion(currentUser.uid)
                    });
                }
                
                return {
                    id: messageDoc.id,
                    text: data.text,
                    senderId: data.senderId,
                    createdAt: data.createdAt,
                    senderName: senderData?.displayName || 'Unknown',
                    senderAvatar: senderData?.avatarUrl,
                    readBy: data.readBy || []
                };
            }));
            setMessages(messagesData);
        });

        return () => unsubscribe();
    }, [group.id, currentUser.uid]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messageData = {
            text: newMessage,
            senderId: currentUser.uid,
            createdAt: serverTimestamp(),
            readBy: [currentUser.uid]
        };

        await addDoc(collection(db, 'messages', group.id, 'chats'), messageData);
        
        const notificationPromises = group.memberUIDs
            .filter(memberId => memberId !== currentUser.uid)
            .map(memberId => {
                return addDoc(collection(db, 'notifications'), {
                    userId: memberId,
                    text: `New message in ${group.name} from ${currentUser.displayName}`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                });
            });

        await Promise.all(notificationPromises);

        setNewMessage('');
    };

    const handleVideoCall = async () => {
        const notificationPromises = group.memberUIDs
            .filter(memberId => memberId !== currentUser.uid)
            .map(memberId => {
                return addDoc(collection(db, 'notifications'), {
                    userId: memberId,
                    text: `${currentUser.displayName} has started a video call in ${group.name}.`,
                    createdAt: serverTimestamp(),
                    isRead: false,
                    context: {
                        type: 'video-call',
                        groupId: group.id,
                    }
                });
            });
        
        try {
            await Promise.all(notificationPromises);
            router.push(`/dashboard/video/${group.id}`);
        } catch (error) {
            console.error("Error creating video call notifications: ", error);
            toast({ title: 'Could not start video call', variant: 'destructive'});
        }
    }

    const getMessageStatus = (message: Message) => {
        if (message.senderId !== currentUser.uid) return null;
        
        const otherMembers = group.memberUIDs.filter(m => m !== currentUser.uid);
        const allRead = otherMembers.every(memberId => message.readBy.includes(memberId));

        if (allRead) {
            return <CheckCheck className="h-4 w-4 text-blue-500" />;
        }
        return <Check className="h-4 w-4 text-muted-foreground" />;
    };

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 border-b flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    <h1 className="text-xl font-bold font-headline tracking-tight">{group.name} Workspace</h1>
                </div>
                 <Button onClick={handleVideoCall} variant="outline" size="sm">
                    <Video className="mr-2 h-4 w-4"/>
                    Start Video Call
                </Button>
            </header>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === currentUser.uid ? 'justify-end' : ''}`}>
                       {msg.senderId !== currentUser.uid && (
                           <Avatar className="h-9 w-9">
                               <AvatarImage src={msg.senderAvatar} />
                               <AvatarFallback>{msg.senderName?.charAt(0)}</AvatarFallback>
                           </Avatar>
                       )}
                       <div className="flex flex-col gap-1 max-w-md">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">{msg.senderName}</span>
                                <span className="text-xs text-muted-foreground">
                                    {msg.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className={`rounded-lg px-3 py-2 ${msg.senderId === currentUser.uid ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                       </div>
                        {msg.senderId === currentUser.uid && (
                           <Avatar className="h-9 w-9">
                               <AvatarImage src={currentUser.photoURL || undefined} />
                               <AvatarFallback>{currentUser.displayName?.charAt(0)}</AvatarFallback>
                           </Avatar>
                       )}
                    </div>
                ))}
                </div>
            </ScrollArea>
             <div className="p-4 border-t bg-card">
                <form onSubmit={handleSendMessage} className="relative">
                    <Input 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type here..." 
                        autoComplete="off"
                        className="pr-24"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        <Button type="submit" size="sm">
                            Send message
                            <Send className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </form>
                 <div className="flex items-center gap-2 mt-2">
                    <Button variant="ghost" size="icon"><Paperclip className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon"><AtSign className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon"><Smile className="h-5 w-5"/></Button>
                    <Button variant="ghost" size="icon"><Mic className="h-5 w-5"/></Button>
                </div>
            </div>
        </div>
    );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm font-medium text-muted-foreground mb-1">{children}</p>
);

export default function GroupWorkspacePage() {
  const params = useParams();
  const groupId = params.id as string;
  const { user, userProfile } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const groupDocRef = doc(db, 'groups', groupId);
    const unsubscribeGroup = onSnapshot(groupDocRef, (doc) => {
      if (doc.exists()) {
        const groupData = { id: doc.id, ...doc.data() } as Group;
        setGroup(groupData);
        
        if (groupData.memberUIDs && groupData.memberUIDs.length > 0) {
            const membersQuery = query(collection(db, 'users'), where('uid', 'in', groupData.memberUIDs));
            onSnapshot(membersQuery, (querySnapshot) => {
                const memberList = querySnapshot.docs.map(d => d.data() as User);
                setMembers(memberList);
            });
        }

      } else {
        console.error("Group not found");
      }
      setLoading(false);
    });

    return () => unsubscribeGroup();
  }, [groupId]);

  if (loading || !user) {
    return <div>Loading workspace...</div>;
  }

  if (!group) {
    return <div>Group not found.</div>;
  }
  
  if (!group.memberUIDs.includes(user.uid)) {
    return <div>You do not have access to this workspace.</div>
  }

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <GroupChat group={group} currentUser={user} />
      </div>
      <div className="w-[350px] hidden md:block">
        <GroupDetail group={group} members={members} />
      </div>
    </div>
  );
}
