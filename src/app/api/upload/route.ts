
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const tenantUuid = formData.get('tenantUuid') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (!tenantUuid) {
            return NextResponse.json({ error: 'Tenant UUID is required' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Determine file extension
        let ext = '';
        if (file.type === 'image/jpeg') ext = '.jpeg';
        else if (file.type === 'image/png') ext = '.png';
        else {
            return NextResponse.json({ error: 'Only JPEG and PNG images are allowed' }, { status: 400 });
        }

        // Create filename
        const filename = `${tenantUuid}${ext}`;

        // Ensure upload directory exists
        const uploadDir = path.join(process.cwd(), 'public/uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e) {
            // Ignore error if directory exists
        }

        // Write file
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, buffer);

        // Return public URL
        const logo_url = `/uploads/${filename}`;
        return NextResponse.json({
            success: true,
            logo_url
        });

    } catch (error: any) {
        console.error('Error uploading file:', error);
        // Return detailed error for debugging purposes
        return NextResponse.json({
            error: 'File upload failed',
            details: error.message,
            path: path.join(process.cwd(), 'public/uploads') // Helpful to verify path context
        }, { status: 500 });
    }
}
