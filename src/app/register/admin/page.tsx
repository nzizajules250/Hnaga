import Link from 'next/link';
import { Logo } from '@/components/logo';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/register-form';

export default function AdminRegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-headline">Admin Registration</CardTitle>
            <CardDescription>
              Enter your details and the admin secret to register.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm isAdminRegistration={true} />
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="underline text-primary font-medium">
                Sign in
              </Link>
            </div>
            <div className="mt-2 text-center text-sm">
              Are you a user?{' '}
              <Link href="/register" className="underline text-primary font-medium">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
