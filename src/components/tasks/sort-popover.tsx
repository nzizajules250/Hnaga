
'use client';

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from '@/components/ui/button';
import { ArrowDownUp } from 'lucide-react';

export function SortPopover() {

  return (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="outline" size="sm"><ArrowDownUp className="mr-2 h-4 w-4" />Sort</Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
            <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">Sort Tasks</h4>
                    <p className="text-sm text-muted-foreground">
                        Sorting functionality is under development.
                    </p>
                </div>
                 <div className="flex items-center justify-center h-24 text-muted-foreground">
                    <p>Coming soon...</p>
                </div>
            </div>
        </PopoverContent>
    </Popover>
  );
}
