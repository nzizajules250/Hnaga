'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Users, ListTodo } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { useAuth } from '@/utils/auth';
import { useRouter } from 'next/navigation';

// Types
interface User {
  role?: string;
  [key: string]: any; // Allow additional properties
}

interface TaskData {
  name: string;
  total: number;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
];

export default function OverviewPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [taskCount, setTaskCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [taskData, setTaskData] = useState<TaskData[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  // Redirect non-admin users to client dashboard
  useEffect(() => {
    const typedUser = user as User;
    if (!loading && isAuthenticated && typedUser?.role !== 'admin') {
      router.push('/dashboard/client');
    }
  }, [loading, isAuthenticated, user, router]);

  // Fetch data (replace with your API calls)
  useEffect(() => {
    if (!isAuthenticated || (user as User)?.role !== 'admin') return;

    // Example: Mock data fetch (replace with real API calls)
    const fetchData = async () => {
      // Simulate API calls
      setTaskCount(42);
      setUserCount(15);
      setProjectCount(7);
      setTaskData([
        { name: 'To Do', total: 12 },
        { name: 'In Progress', total: 8 },
        { name: 'Done', total: 22 },
      ]);
    };

    fetchData();
  }, [isAuthenticated, user]);

  // Debug logging
  console.log('Dashboard Auth Debug:', {
    loading,
    isAuthenticated,
    user,
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null
  });

  // Loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  // Guard clauses for non-authenticated or non-admin users
  if (!isAuthenticated) return null;
  const typedUser: User = user ? user as User : { role: undefined };
  if (typedUser.role !== 'admin') return null;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold font-headline tracking-tight">
          Overview
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskCount}</div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
            <p className="text-xs text-muted-foreground">Registered in the system</p>
          </CardContent>
        </Card>

        <Card className="transition-transform duration-300 hover:scale-105 hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
            <p className="text-xs text-muted-foreground">Managed by the team</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Task Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          <ResponsiveContainer width="100%" height={350}>
            <RechartsBarChart data={taskData}>
              <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}`} 
              />
              <Tooltip
                cursor={{ fill: 'hsla(var(--muted))' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {taskData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}