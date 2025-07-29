
'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, getDoc, getDocs, DocumentData, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/auth-provider';
import { MessageSquare, Send, Users, Check, CheckCheck } from 'lucide-react';
import { getDatabase, ref, onValue, off, set } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

type User = {
  id: string;
  uid: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  isActive?: boolean;
};

type Group = {
  id: string;
  name: string;
  memberUIDs: string[]; // array of uids
  createdBy: string;
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

type Conversation = {
    id: string;
    type: 'user' | 'group';
    name: string;
    avatarUrl?: string;
    members?: User[];
    allMemberIds?: string[];
};

type TypingStatus = {
    [userId: string]: boolean;
}

export default function MessagesPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingStatus>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch users
  useEffect(() => {
    const usersCollection = collection(db, 'users');
    const unsubscribe = onSnapshot(usersCollection, (snapshot) => {
      const userList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(u => u.uid !== user?.uid);
      setUsers(userList);
    });
    return () => unsubscribe();
  }, [user]);

  // Fetch groups the current user is a member of
   useEffect(() => {
    if (!user) return;
    const groupsQuery = query(collection(db, 'groups'), where('memberUIDs', 'array-contains', user.uid));
    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
      setGroups(groupList);
    });
    return () => unsubscribe();
  }, [user]);
  
  // Handle pre-selection from URL
  useEffect(() => {
      const groupId = searchParams.get('groupId');
      if (groupId && groups.length > 0) {
          const group = groups.find(g => g.id === groupId);
          if (group) {
              handleSelectConversation(group, 'group');
          }
      }
  }, [searchParams, groups]);


  // Fetch messages for the selected conversation
  useEffect(() => {
    if (!selectedConversation || !user) return;

    let conversationId = selectedConversation.id;
    if (selectedConversation.type === 'user') {
        conversationId = getConversationId(user.uid, selectedConversation.id);
    }
    
    const messagesQuery = query(collection(db, 'messages', conversationId, 'chats'), orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const uniqueSenders = new Map<string, DocumentData>();
      let hasUnreadMessages = false;
      
      const messagesData: Message[] = await Promise.all(snapshot.docChanges().map(async (change) => {
         if (change.type === "added") {
            const data = change.doc.data();
            let senderData: DocumentData | undefined = uniqueSenders.get(data.senderId);

            if(!senderData) {
                const userDocRef = query(collection(db, 'users'), where('uid', '==', data.senderId));
                const userSnap = await getDocs(userDocRef);
                if (!userSnap.empty) {
                    senderData = userSnap.docs[0].data();
                    uniqueSenders.set(data.senderId, senderData);
                }
            }
            
            // Mark message as read
            const readBy = data.readBy || [];
            if (!readBy.includes(user.uid)) {
                hasUnreadMessages = true;
                const messageRef = doc(db, 'messages', conversationId, 'chats', change.doc.id);
                await updateDoc(messageRef, {
                    readBy: arrayUnion(user.uid)
                });
            }
            
            return {
              id: change.doc.id,
              text: data.text,
              senderId: data.senderId,
              createdAt: data.createdAt,
              senderName: senderData?.displayName || 'Unknown',
              senderAvatar: senderData?.avatarUrl,
              readBy: [...readBy, user.uid], // Optimistically update
            };
        }
        return null; // Handle other change types if necessary
      }));

      setMessages(prevMessages => [...prevMessages, ...messagesData.filter(Boolean) as Message[]]);
      
    });

    return () => unsubscribe();
  }, [selectedConversation, user, toast]);

    // Typing indicator listener
    useEffect(() => {
        if (!selectedConversation || !user) return;
        let conversationId = selectedConversation.id;
        if (selectedConversation.type === 'user') {
            conversationId = getConversationId(user.uid, selectedConversation.id);
        }
        
        const dbRT = getDatabase();
        const typingRef = ref(dbRT, `typing/${conversationId}`);
        
        onValue(typingRef, (snapshot) => {
            const data = snapshot.val();
            if(data) {
                const otherTypingUsers = { ...data };
                delete otherTypingUsers[user.uid]; // Don't show self as typing
                setTypingUsers(otherTypingUsers);
            } else {
                setTypingUsers({});
            }
        });

        return () => {
            off(typingRef);
        };
    }, [selectedConversation, user]);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedConversation) return;

    let conversationId = selectedConversation.id;
    let recipients: string[] = [];

    if (selectedConversation.type === 'user') {
        conversationId = getConversationId(user.uid, selectedConversation.id);
        recipients.push(selectedConversation.id);
    } else {
        recipients = selectedConversation.allMemberIds?.filter(id => id !== user.uid) || [];
    }

    await addDoc(collection(db, 'messages', conversationId, 'chats'), {
      text: newMessage,
      senderId: user.uid,
      createdAt: serverTimestamp(),
      readBy: [user.uid] // Sender has read it by default
    });

    // Create notifications for recipients
    const notificationPromises = recipients.map(userId => {
        return addDoc(collection(db, 'notifications'), {
            userId: userId,
            text: `New message from ${user.displayName}`,
            createdAt: serverTimestamp(),
            isRead: false,
            // Add conversation context to avoid showing toast if user is in the chat
            context: { type: 'message', conversationId }
        });
    });
    await Promise.all(notificationPromises);

    setNewMessage('');
    
    // Stop typing indicator
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const dbRT = getDatabase();
    const userTypingRef = ref(dbRT, `typing/${conversationId}/${user.uid}`);
    set(userTypingRef, false);

  };

    const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        if (!user || !selectedConversation) return;

        let conversationId = selectedConversation.id;
        if (selectedConversation.type === 'user') {
            conversationId = getConversationId(user.uid, selectedConversation.id);
        }

        const dbRT = getDatabase();
        const userTypingRef = ref(dbRT, `typing/${conversationId}/${user.uid}`);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        } else {
            set(userTypingRef, true);
        }

        typingTimeoutRef.current = setTimeout(() => {
            set(userTypingRef, false);
            typingTimeoutRef.current = null;
        }, 3000); // 3 seconds timeout
    };


  const getConversationId = (userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('_');
  }
  
  const handleSelectConversation = useCallback((item: User | Group, type: 'user' | 'group') => {
      setMessages([]); // Clear previous messages
      setSelectedConversation(null); // Reset to show loading state
      if (type === 'user') {
          const typedItem = item as User;
          setSelectedConversation({
              id: typedItem.uid,
              type: 'user',
              name: typedItem.displayName,
              avatarUrl: typedItem.avatarUrl,
          });
      } else {
           const typedItem = item as Group;
           // Efficiently get member details from the already fetched `users` state
           const memberDetails = (typedItem.memberUIDs || [])
            .map(uid => users.find(u => u.uid === uid) || (user?.uid === uid ? {uid: user.uid, displayName: user.displayName, avatarUrl: user.photoURL } : null))
            .filter((u): u is User => !!u);

           setSelectedConversation({
              id: typedItem.id,
              type: 'group',
              name: typedItem.name,
              members: memberDetails,
              allMemberIds: typedItem.memberUIDs,
          });
      }
  }, [users, user]);
  
  const activeUsersInGroup = useMemo(() => {
      if (selectedConversation?.type === 'group' && selectedConversation.members) {
          const activeMembers = selectedConversation.members.filter(m => m.isActive).map(m => m.displayName);
          return activeMembers.length > 0 ? activeMembers.join(', ') : 'No one is active';
      }
      return '';
  }, [selectedConversation]);
  
  const getMessageStatus = (message: Message) => {
    if (!user || message.senderId !== user.uid) return null;
    
    let otherParticipants: string[] = [];

    if (selectedConversation?.type === 'user') {
        otherParticipants = [selectedConversation.id];
    } else if (selectedConversation?.type === 'group') {
        otherParticipants = selectedConversation.allMemberIds?.filter(id => id !== user.uid) || [];
    }
    
    const readBy = message.readBy || [];
    const allRead = otherParticipants.every(memberId => readBy.includes(memberId));

    if (allRead) {
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
    }
    
    // Check if at least one other person has read it
    const anyoneElseRead = otherParticipants.some(memberId => readBy.includes(memberId));
    if(anyoneElseRead) {
        return <CheckCheck className="h-4 w-4 text-muted-foreground" />;
    }

    return <Check className="h-4 w-4 text-muted-foreground" />;
  };

  const typingDisplay = useMemo(() => {
    const activeTypingUsers = Object.entries(typingUsers)
        .filter(([, isTyping]) => isTyping)
        .map(([userId]) => {
            if (selectedConversation?.type === 'group') {
                return selectedConversation.members?.find(m => m.uid === userId)?.displayName;
            }
            // For one-on-one chat, it's just the other person
            return selectedConversation?.name;
        })
        .filter(Boolean);

    if (activeTypingUsers.length === 0) return '';
    if (activeTypingUsers.length === 1) return `${activeTypingUsers[0]} is typing...`;
    
    return 'Multiple people are typing...';
  }, [typingUsers, selectedConversation]);


  return (
    <div className="flex h-full">
      <Card className="w-1/3 h-full flex flex-col">
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2">
            <h3 className="text-sm font-semibold text-muted-foreground px-2 py-1">Groups</h3>
            {groups.map((group) => (
                <div key={group.id} onClick={() => handleSelectConversation(group, 'group')}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted ${selectedConversation?.id === group.id ? 'bg-muted' : ''}`}>
                <Avatar className="h-9 w-9">
                    <AvatarFallback><Users className="h-5 w-5"/></AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{group.name}</p>
                </div>
                </div>
            ))}
            <h3 className="text-sm font-semibold text-muted-foreground px-2 py-1 mt-4">Users</h3>
            {users.map((u) => (
                <div key={u.id} onClick={() => handleSelectConversation(u, 'user')}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted ${selectedConversation?.id === u.uid ? 'bg-muted' : ''}`}>
                <Avatar className="h-9 w-9">
                    <AvatarImage src={u.avatarUrl} />
                    <AvatarFallback>{u.displayName?.charAt(0)}</AvatarFallback>
                    {u.isActive && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />}
                </Avatar>
                <div>
                    <p className="font-semibold">{u.displayName}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                </div>
            ))}
        </CardContent>
      </Card>
      <div className="flex-1 flex flex-col h-full">
        {selectedConversation ? (
          <div className="flex flex-col h-full bg-muted/20 rounded-r-xl">
             <header className="p-4 border-b flex flex-col items-start gap-1 bg-card rounded-tr-xl">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        {selectedConversation.avatarUrl ? <AvatarImage src={selectedConversation.avatarUrl} /> : null}
                        <AvatarFallback>
                            {selectedConversation.type === 'user' ? selectedConversation.name.charAt(0) : <Users className="h-5 w-5"/>}
                        </AvatarFallback>
                    </Avatar>
                    <h2 className="text-lg font-semibold">{selectedConversation.name}</h2>
                </div>
                 {selectedConversation.type === 'group' && (
                    <p className="text-xs text-green-500 pl-12">Active: {activeUsersInGroup}</p>
                 )}
            </header>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                       {msg.senderId !== user?.uid && (
                           <Avatar className="h-8 w-8">
                               <AvatarImage src={msg.senderAvatar} />
                               <AvatarFallback>{msg.senderName?.charAt(0)}</AvatarFallback>
                           </Avatar>
                       )}
                        <div className={`rounded-lg px-4 py-2 max-w-sm flex items-end gap-2 ${msg.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
                            <p className="text-sm">{msg.text}</p>
                            {getMessageStatus(msg)}
                        </div>
                         {msg.senderId === user?.uid && userProfile && (
                           <Avatar className="h-8 w-8">
                               <AvatarImage src={userProfile.avatarUrl || undefined} />
                               <AvatarFallback>{userProfile.displayName?.charAt(0)}</AvatarFallback>
                           </Avatar>
                       )}
                    </div>
                ))}
                </div>
            </ScrollArea>
             <footer className="p-4 border-t bg-card rounded-br-xl">
                 {typingDisplay && <p className="text-xs text-muted-foreground mb-2 h-4">{typingDisplay}</p>}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input value={newMessage} onChange={handleTyping} placeholder="Type a message..." autoComplete="off" />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </footer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/20 rounded-r-xl">
            <MessageSquare className="h-16 w-16" />
            <h2 className="text-xl font-semibold mt-4">Select a conversation</h2>
            <p>Start messaging by choosing a user or group from the list.</p>
          </div>
        )}
      </div>
    </div>
  );
}

    