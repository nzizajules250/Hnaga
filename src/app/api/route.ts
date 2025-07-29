
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: "Welcome to the HangaHub Central API",
    routes: [
      "/api/tasks",
      "/api/projects",
      "/api/groups",
    ]
  });
}
