
'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Rocket, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/logo';
import { useAuth } from '@/context/auth-provider';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 flex justify-between items-center">
        <Logo />
        <nav>
          {loading ? (
            <div className="h-10 w-24 bg-muted/50 rounded-md animate-pulse" />
          ) : user ? (
            <Button asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="mr-2" />
                Dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get Started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold font-headline tracking-tighter mb-4">
            Welcome to FocusOS
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Your central hub for collaboration, tasks, and innovation. Connect with your team, manage projects, and bring your ideas to life.
          </p>
          <div className="flex justify-center gap-4">
             {loading ? (
                <>
                    <div className="h-11 w-36 bg-muted/50 rounded-md animate-pulse" />
                    <div className="h-11 w-28 bg-muted/50 rounded-md animate-pulse" />
                </>
             ) : user ? (
                <Button asChild size="lg">
                    <Link href="/dashboard">
                        Go to Dashboard
                    </Link>
                </Button>
             ) : (
                <>
                    <Button asChild size="lg">
                    <Link href="/register">
                        <Rocket className="mr-2" />
                        Get Started
                    </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                    <Link href="/login">Sign In</Link>
                    </Button>
                </>
             )}
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground">
        © {new Date().getFullYear()} FocusOS. All rights reserved.
      </footer>
    </div>
  );
}
