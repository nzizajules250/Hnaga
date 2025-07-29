
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

type Group = {
  id: string;
  name: string;
  memberUIDs: string[];
};

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const groupId = params.id as string;
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!groupId) return;
    const groupDocRef = doc(db, 'groups', groupId);
    const unsubscribe = onSnapshot(groupDocRef, (doc) => {
      if (doc.exists()) {
        setGroup({ id: doc.id, ...doc.data() } as Group);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Placeholder for peer connection logic
        if (remoteVideoRef.current) {
            // In a real app, you would set the remote stream here
            // remoteVideoRef.current.srcObject = remoteStream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this feature.',
        });
      }
    };
    getCameraPermission();
  }, [toast]);
  
  const handleLeaveCall = () => {
      // Stop media tracks
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      router.back();
  }

  if (loading || !user) {
    return <div>Loading...</div>;
  }
  
  if (!group) {
    return <div>Group not found.</div>;
  }
  
  if (!group.memberUIDs.includes(user.uid)) {
    return <div>You are not a member of this group.</div>
  }

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-4">
        <h2 className="text-3xl font-bold font-headline tracking-tight">
          Video Call: {group.name}
        </h2>
        <Button variant="destructive" onClick={handleLeaveCall}>
            <PhoneOff className="mr-2 h-4 w-4"/>
            Leave Call
        </Button>
      </div>
      
       {!hasCameraPermission && (
          <Alert variant="destructive" className="mb-4">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access to use this feature. The app is attempting to acquire permission.
              </AlertDescription>
          </Alert>
        )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="relative">
          <video ref={videoRef} className="w-full h-full object-cover rounded-md" autoPlay muted playsInline />
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded-md text-sm">
            {user.displayName}
          </div>
        </Card>
         <Card className="bg-muted relative flex items-center justify-center">
            {/* This would be for the remote stream */}
            <video ref={remoteVideoRef} className="w-full h-full object-cover rounded-md" autoPlay playsInline/>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <p>Waiting for others to join...</p>
            </div>
        </Card>
      </div>

      <div className="flex justify-center items-center gap-4 mt-4 p-4 bg-card rounded-lg">
          <Button variant={isMicMuted ? "secondary" : "default"} size="icon" className="rounded-full h-12 w-12" onClick={() => setIsMicMuted(!isMicMuted)}>
              {isMicMuted ? <MicOff /> : <Mic />}
          </Button>
          <Button variant={isCameraOff ? "secondary" : "default"} size="icon" className="rounded-full h-12 w-12" onClick={() => setIsCameraOff(!isCameraOff)}>
              {isCameraOff ? <VideoOff /> : <VideoIcon />}
          </Button>
      </div>
    </div>
  );
}
