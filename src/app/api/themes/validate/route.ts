import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { validateThemeDefinition } from '@/lib/themeValidation';

/**
 * POST /api/themes/validate — dry-run validate a theme definition against the v1
 * schema without persisting. Powers the authoring editor's live validation.
 * Body: { definition }  →  { valid: boolean, errors: string[] }
 */
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!['SYSTEM_ADMIN', 'ORG_ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ valid: false, errors: ['Body is not valid JSON.'] });
    }
    const result = validateThemeDefinition(body?.definition);
    return NextResponse.json(result);
}
