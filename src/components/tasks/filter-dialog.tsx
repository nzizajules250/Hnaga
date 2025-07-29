
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function FilterDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Filter Tasks</DialogTitle>
          <DialogDescription>
            Filter functionality is under development.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>Coming soon...</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
