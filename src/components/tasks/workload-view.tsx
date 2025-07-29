
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function WorkloadView() {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User /> Workload
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <p>Workload view is under development.</p>
        </div>
      </CardContent>
    </Card>
  );
}
