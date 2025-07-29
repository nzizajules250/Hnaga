
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Filter, LayoutGrid, List, Calendar, GanttChartSquare, User, MessageCircle, ArrowDownUp, GripVertical, Users } from 'lucide-react';

import BoardView from '@/components/tasks/board-view';
import ListView from '@/components/tasks/list-view';
import CalendarView from '@/components/tasks/calendar-view';
import OverviewPage from '../page';
import WorkloadView from '@/components/tasks/workload-view';
import { FilterDialog } from '@/components/tasks/filter-dialog';
import { SortPopover } from '@/components/tasks/sort-popover';
import TimelineView from '@/components/tasks/timeline-view';
import { useAuth } from '@/context/auth-provider';


type View = 'Overview' | 'List' | 'Board' | 'Calendar' | 'Timeline' | 'Workload' | 'Message';

// Accept projectId as an optional prop
export default function TasksPage({ projectId }: { projectId?: string }) {
  const { userProfile } = useAuth();
  const [activeView, setActiveView] = useState<View>('Board');
  const [isFilterOpen, setFilterOpen] = useState(false);

  const renderView = () => {
    switch (activeView) {
      case 'Board':
        // Pass projectId to BoardView
        return <BoardView projectId={projectId} />;
      case 'List':
        return <ListView projectId={projectId} />;
      case 'Calendar':
        return <CalendarView projectId={projectId} />;
      case 'Overview':
        // Only admins should see the general overview
        return userProfile?.role === 'admin' ? <OverviewPage /> : <BoardView projectId={projectId}/>;
      case 'Workload':
        return <WorkloadView />;
      case 'Timeline':
        return <TimelineView projectId={projectId}/>;
      case 'Message':
        return <div className="flex items-center justify-center h-full text-muted-foreground"><p>Message view is under development.</p></div>;
      default:
        return <BoardView projectId={projectId} />;
    }
  };
  
  const viewButtonsAdmin: { id: View, label: string, icon: React.ElementType }[] = [
    { id: 'Overview', label: 'Overview', icon: LayoutGrid },
    { id: 'List', label: 'List', icon: List },
    { id: 'Board', label: 'Board', icon: GripVertical },
    { id: 'Calendar', label: 'Calendar', icon: Calendar },
    { id: 'Timeline', label: 'Timeline', icon: GanttChartSquare },
    { id: 'Workload', label: 'Workload', icon: User },
    { id: 'Message', label: 'Message', icon: MessageCircle },
  ];
  
  const viewButtonsUser: { id: View, label: string, icon: React.ElementType }[] = [
    { id: 'List', label: 'List', icon: List },
    { id: 'Board', label: 'Board', icon: GripVertical },
    { id: 'Calendar', label: 'Calendar', icon: Calendar },
  ];

  const viewButtons = userProfile?.role === 'admin' ? viewButtonsAdmin : viewButtonsUser;

  return (
    <div className="h-full flex flex-col">
       <div className="flex items-center justify-between pb-4 border-b mb-4 -mt-2">
            <div className="flex items-center gap-2 flex-wrap">
                {viewButtons.map(({ id, label, icon: Icon }) => (
                    <Button 
                        key={id} 
                        variant={activeView === id ? 'secondary' : 'ghost'} 
                        size="sm" 
                        onClick={() => setActiveView(id)}
                    >
                        <Icon className="mr-2 h-4 w-4" />
                        {label}
                    </Button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}><Filter className="mr-2 h-4 w-4" />Filter</Button>
                <SortPopover />
                <Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />Group</Button>
            </div>
       </div>
       <div className="flex-1 overflow-auto">
        {renderView()}
       </div>
       <FilterDialog open={isFilterOpen} onOpenChange={setFilterOpen} />
    </div>
  );
}
