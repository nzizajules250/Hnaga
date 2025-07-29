
'use client';

import React, { useEffect, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { add, format, startOfMonth } from 'date-fns';
import { Task } from './board-view';
import { useAuth } from '@/context/auth-provider';

const priorityClasses: {[key in Task['priority']]: string} = {
  High: 'bg-red-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-blue-500',
};

export default function CalendarView({ projectId }: { projectId?: string }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchTasks = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const start = startOfMonth(currentMonth);
            const end = add(start, {months: 1});

            const queryParams = new URLSearchParams({
                userId: user.uid,
                role: 'user', // Simplified for now
                startDate: format(start, 'yyyy-MM-dd'),
                endDate: format(end, 'yyyy-MM-dd')
            });

            if (projectId) {
                queryParams.set('projectId', projectId);
            }
            
            const response = await fetch(`/api/tasks?${queryParams.toString()}`);
            if(!response.ok) throw new Error('Failed to fetch tasks');
            const data = await response.json();
            setTasks(data.filter((task: Task) => task.dueDate));
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setLoading(false);
        }
    }
    fetchTasks();
  }, [user, currentMonth, projectId]);

  const tasksForSelectedDate = tasks.filter(task => {
    if (!task.dueDate || !selectedDate) return false;
    // Compare dates without time part
    const taskDate = new Date(task.dueDate);
    const selected = new Date(selectedDate);
    taskDate.setUTCHours(0,0,0,0);
    selected.setUTCHours(0,0,0,0);
    
    return taskDate.getTime() === selected.getTime() || 
           (taskDate.toDateString() === selected.toDateString()); // Fallback for timezone issues
  });
  
  const DayWithDot = ({ date }: { date: Date }) => {
    const hasTask = tasks.some(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return date.getDate() === taskDate.getUTCDate() &&
               date.getMonth() === taskDate.getUTCMonth() &&
               date.getFullYear() === taskDate.getUTCFullYear();
    });

    return (
        <div className="relative h-full w-full">
            {date.getDate()}
            {hasTask && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary" />}
        </div>
    );
  };

  if (loading) {
    return <div>Loading tasks...</div>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 h-full">
      <Card className="md:col-span-2">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          month={currentMonth}
          onMonthChange={setCurrentMonth}
          className="p-0"
          classNames={{
             months: "h-full",
             month: "h-full flex flex-col",
             table: "flex-1",
             head_row: "grid grid-cols-7",
             row: "grid grid-cols-7 h-full",
             cell: "w-full h-full",
             day: "w-full h-full"
          }}
          components={{
            Day: ({ date }) => <DayWithDot date={date} />
          }}
        />
      </Card>
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          Tasks for {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'today'}
        </h3>
        <Card>
            <CardContent className="p-4 space-y-3">
            {tasksForSelectedDate.length > 0 ? (
                tasksForSelectedDate.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted">
                    <span className={`h-2 w-2 rounded-full ${priorityClasses[task.priority]}`} />
                    <p className="font-medium">{task.title}</p>
                </div>
                ))
            ) : (
                <p className="text-muted-foreground p-2">No tasks scheduled for this day.</p>
            )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
