import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path } = params;
    
    // Validate path
    if (!path || path.length === 0) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    // Build file path
    const filePath = join(process.cwd(), 'public', 'locales', ...path);
    
    // Security check - ensure we're only serving JSON files from locales directory
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (!normalizedPath.includes('/locales/') || !normalizedPath.endsWith('.json')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Read and return the file
    const fileContent = await readFile(filePath, 'utf-8');
    const jsonContent = JSON.parse(fileContent);
    
    return NextResponse.json(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error serving locale file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
