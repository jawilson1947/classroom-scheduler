
import { NextRequest, NextResponse } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';

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

        // Determine mime type
        let mimeType = '';
        if (file.type === 'image/jpeg') mimeType = 'image/jpeg';
        else if (file.type === 'image/png') mimeType = 'image/png';
        else {
            return NextResponse.json({ error: 'Only JPEG and PNG images are allowed' }, { status: 400 });
        }

        // Convert to Base64 Data URI
        const base64Image = buffer.toString('base64');
        const logo_url = `data:${mimeType};base64,${base64Image}`;

        // Return the Data URI to be saved in the database
        return NextResponse.json({
            success: true,
            logo_url
        });

    } catch (error: any) {
        console.error('Error processing file:', error);
        // Return detailed error for debugging purposes
        return NextResponse.json({
            error: 'File upload failed',
            details: error.message
        }, { status: 500 });
    }
}
