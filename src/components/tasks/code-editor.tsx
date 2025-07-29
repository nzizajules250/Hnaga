
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PanelLeft, PanelRight, Upload, Send, Terminal } from 'lucide-react';
import type { Task } from './board-view';
import { useAuth } from '@/context/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Editor from "@monaco-editor/react";
import { cn } from '@/lib/utils';

const MemberList = ({ members }: { members: Task['assignees'] }) => (
    <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle className="text-lg">Group Members</CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1">
            <CardContent className="space-y-4">
                {members?.map(member => (
                    <div key={member.id} className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold">{member.name}</p>
                    </div>
                ))}
            </CardContent>
        </ScrollArea>
    </Card>
);

const SubmissionStatus = ({ submissions }: { submissions: Task['submissions'] }) => (
     <Card className="h-full flex flex-col">
        <CardHeader>
            <CardTitle className="text-lg">Submission Status</CardTitle>
            <CardDescription>See who has completed the task.</CardDescription>
        </CardHeader>
        <ScrollArea className="flex-1">
            <CardContent className="space-y-4">
                {submissions && submissions.length > 0 ? (
                    submissions.map(submission => (
                        <div key={submission.userId} className="flex items-center gap-3">
                            <Badge variant="secondary">Submitted</Badge>
                            <p className="font-semibold">{submission.userName}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground">No submissions yet.</p>
                )}
            </CardContent>
        </ScrollArea>
    </Card>
)

export default function CodeEditor({ task }: { task: Task }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [code, setCode] = useState('// Start coding here...');
    const [leftPanelVisible, setLeftPanelVisible] = useState(true);
    const [rightPanelVisible, setRightPanelVisible] = useState(true);

    const handleSubmission = async () => {
        if (!user) return;
        try {
            const submissionData = {
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                submittedAt: new Date(),
                code, // Save the code with the submission
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
    };
    

    return (
        <div className="flex h-screen bg-muted/20">
            {/* Left Panel */}
            <div className={cn(
                "transition-all duration-300 ease-in-out",
                leftPanelVisible ? "w-64 p-4" : "w-0 p-0"
            )}>
                {leftPanelVisible && <MemberList members={task.assignees} />}
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col p-4 gap-4">
                <header className="flex items-center justify-between">
                     <Button variant="ghost" size="icon" onClick={() => setLeftPanelVisible(!leftPanelVisible)}>
                        <PanelLeft />
                    </Button>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold font-headline">{task.title}</h1>
                        <p className="text-muted-foreground">{task.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setRightPanelVisible(!rightPanelVisible)}>
                        <PanelRight />
                    </Button>
                </header>

                <Card className="flex-1 flex flex-col">
                    <CardContent className="p-0 flex-1 flex flex-col">
                        <Editor
                            height="100%"
                            defaultLanguage="javascript"
                            defaultValue={code}
                            onChange={(value) => setCode(value || '')}
                            theme="vs-dark"
                        />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="p-2 border-b">
                        <h3 className="font-mono text-sm flex items-center gap-2"><Terminal className="h-4 w-4"/> Terminal</h3>
                    </CardHeader>
                    <CardContent className="p-2 h-32 bg-black text-green-400 font-mono text-xs overflow-y-auto">
                        <p>&gt; Mock terminal ready. Full functionality is under development.</p>
                        <p>&gt; You can run `node` or `git` commands here in a future update.</p>
                    </CardContent>
                </Card>

                <div className="flex gap-4">
                    <Button variant="outline" className="w-full">
                        <Upload className="mr-2 h-4 w-4"/> Upload File
                    </Button>
                    <Button onClick={handleSubmission} className="w-full">
                         <Send className="mr-2 h-4 w-4"/> Submit Work
                    </Button>
                </div>
            </div>

            {/* Right Panel */}
             <div className={cn(
                "transition-all duration-300 ease-in-out",
                rightPanelVisible ? "w-64 p-4" : "w-0 p-0"
            )}>
                {rightPanelVisible && <SubmissionStatus submissions={task.submissions} />}
            </div>
        </div>
    );
}
