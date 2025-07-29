'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { apiRequest, authUtils } from '@/utils/auth';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  adminSecret: z.string().optional(),
});

export function RegisterForm({ isAdminRegistration = false }: { isAdminRegistration?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      adminSecret: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await apiRequest('http://localhost:5000/api/register', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
          role: isAdminRegistration ? 'admin' : 'user',
          adminSecret: values.adminSecret,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth data
        authUtils.setToken(data.token);
        authUtils.setUser(data.user);
        
        toast({ 
          title: 'Account Created!', 
          description: `Welcome ${data.user.name}! Redirecting to dashboard...` 
        });
        router.push('/dashboard');
      } else {
        toast({
          variant: 'destructive',
          title: 'Registration Failed',
          description: data.message || 'An unknown error occurred. Please try again.',
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || 'Network error. Please check your connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {isAdminRegistration && (
          <FormField
            control={form.control}
            name="adminSecret"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Secret Code</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Admin Secret" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Account
        </Button>
      </form>
    </Form>
  );
}