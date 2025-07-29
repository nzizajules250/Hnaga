
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings, User, Lock, Upload, KeyRound, Users } from 'lucide-react';
import { useAuth } from '@/context/auth-provider';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { storage as appwriteStorage } from '@/lib/appwrite';
import { ID } from 'appwrite';
import { updateProfile } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const adminSecretSchema = z.object({
  secret: z.string().min(6, 'Secret must be at least 6 characters.'),
});

const profileSchema = z.object({
    displayName: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name cannot exceed 50 characters."),
});

type Group = {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);


  const adminForm = useForm<z.infer<typeof adminSecretSchema>>({
    resolver: zodResolver(adminSecretSchema),
    defaultValues: { secret: '' },
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: user?.displayName || '' },
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        profileForm.reset({ displayName: user.displayName || '' });

        if (userProfile?.role === 'user') {
            const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
            const groupsSnapshot = await getDocs(groupsQuery);
            const groupsList = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
            setUserGroups(groupsList);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [user, userProfile, profileForm]);

  const handleSecretChange = async (values: z.infer<typeof adminSecretSchema>) => {
    try {
      await setDoc(doc(db, 'secrets', 'admin'), { code: values.secret });
      toast({ title: 'Success!', description: 'Admin secret code has been updated.' });
      adminForm.reset();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update secret code.' });
    }
  };

  const handleProfileUpdate = async (values: z.infer<typeof profileSchema>) => {
      if (!user) return;
      try {
          await updateProfile(user, { displayName: values.displayName });
          await updateDoc(doc(db, 'users', user.uid), { displayName: values.displayName });
          toast({ title: 'Success!', description: 'Your profile has been updated.' });
      } catch (error) {
           toast({ variant: 'destructive', title: 'Error', description: 'Failed to update profile.' });
      }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files || !user) return;
      const file = event.target.files[0];
      if (!file) return;

      setIsUploading(true);
      
      try {
          const response = await appwriteStorage.createFile(
              process.env.NEXT_PUBLIC_APPWRITE_AVATAR_BUCKET_ID!,
              ID.unique(),
              file
          );

          const avatarUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${response.bucketId}/files/${response.$id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;
          
          await updateProfile(user, { photoURL: avatarUrl });
          await updateDoc(doc(db, 'users', user.uid), { avatarUrl });

          toast({ title: "Avatar updated successfully!" });
      } catch(error) {
          console.error("Error uploading avatar: ", error);
          toast({ variant: "destructive", title: "Error uploading avatar" });
      } finally {
          setIsUploading(false);
      }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">
          Settings
        </h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6" /> Profile
            </CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.photoURL || undefined} />
                    <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploading ? 'Uploading...' : 'Upload Avatar'}
                </Button>
                <Input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    className="hidden"
                    accept="image/png, image/jpeg"
                />
            </div>
            <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                     <p><strong>Email:</strong> {user?.email}</p>
                     <p><strong>Role:</strong> <span className="capitalize">{userProfile?.role}</span></p>
                  </div>
                  <Button type="submit">Save Changes</Button>
                </form>
            </Form>
            {userProfile?.role === 'user' && (
                <div className="space-y-4">
                    <div>
                         <h4 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Your Groups</h4>
                         <div className="flex flex-wrap gap-2 mt-2">
                            {userGroups.length > 0 ? (
                                userGroups.map(group => <Badge key={group.id} variant="secondary">{group.name}</Badge>)
                            ) : (
                                <p className="text-sm text-muted-foreground">You are not a member of any groups.</p>
                            )}
                         </div>
                    </div>
                     <div>
                         <h4 className="text-lg font-semibold flex items-center gap-2"><KeyRound className="h-5 w-5" /> Security</h4>
                         <Button variant="outline" className="mt-2" disabled>Change Password</Button>
                         <p className="text-xs text-muted-foreground mt-1">Password change functionality is under development.</p>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>
        {userProfile?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-6 w-6" /> Admin Settings
              </CardTitle>
              <CardDescription>Manage application-wide settings.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...adminForm}>
                <form onSubmit={adminForm.handleSubmit(handleSecretChange)} className="space-y-4">
                  <FormField
                    control={adminForm.control}
                    name="secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Secret Code</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="New Secret Code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Update Secret</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
