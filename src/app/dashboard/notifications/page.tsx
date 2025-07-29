
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '@/context/auth-provider';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
    id: string;
    userId: string;
    text: string;
    createdAt: any;
    isRead: boolean;
};

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'notifications'), 
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifs);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
             <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold font-headline tracking-tight">
                    Notifications
                </h2>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Recent Notifications</CardTitle>
                    <CardDescription>
                        Here's a list of your recent notifications.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {loading ? (
                            <p>Loading notifications...</p>
                        ) : notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <div key={notification.id} className={`flex items-start gap-4 p-3 rounded-lg ${!notification.isRead ? 'bg-primary/5' : ''}`}>
                                    <div className="bg-primary/10 text-primary p-2 rounded-full">
                                        <Bell className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p>{notification.text}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {notification.createdAt ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true }) : ''}
                                        </p>
                                    </div>
                                    {!notification.isRead && <div className='h-2 w-2 rounded-full bg-primary mt-1'></div>}
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground">You have no new notifications.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
