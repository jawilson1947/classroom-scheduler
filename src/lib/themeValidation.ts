import fs from 'fs';
import path from 'path';
import Ajv, { ValidateFunction } from 'ajv';

/**
 * Server-side validation of theme definitions against the canonical JSON Schema
 * (docs/theme.schema.v1.json — the single source of truth shared with the native
 * clients). Used by the themes authoring endpoints (POST/PUT) and the live
 * /api/themes/validate endpoint.
 *
 * The schema is draft-07; ajv 6 targets draft-07 natively. The schema's `$ref`
 * pointers (#/$defs/…) resolve structurally, so the draft-2019 `$defs` keyword is
 * handled fine. Compiled once per server process and cached.
 */

let cached: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
    if (cached) return cached;
    const schemaPath = path.join(process.cwd(), 'docs', 'theme.schema.v1.json');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const ajv = new Ajv({ allErrors: true });
    cached = ajv.compile(schema);
    return cached;
}

export interface ThemeValidationResult {
    valid: boolean;
    /** Human-readable error strings (empty when valid). */
    errors: string[];
}

/** Validate a parsed theme definition object against the v1 schema. */
export function validateThemeDefinition(definition: unknown): ThemeValidationResult {
    let validate: ValidateFunction;
    try {
        validate = getValidator();
    } catch (e) {
        // Schema file missing/unreadable — fail closed with a clear message.
        return { valid: false, errors: [`Theme schema unavailable: ${(e as Error).message}`] };
    }

    if (definition === null || typeof definition !== 'object' || Array.isArray(definition)) {
        return { valid: false, errors: ['Definition must be a JSON object.'] };
    }

    const valid = validate(definition) as boolean;
    if (valid) return { valid: true, errors: [] };

    const errors = (validate.errors ?? []).map((e) => {
        const where = e.dataPath ? e.dataPath.replace(/^\./, '') : '(root)';
        // Surface allowed values for enum/const failures to make fixes obvious.
        const params = e.params as Record<string, unknown>;
        const extra =
            'allowedValues' in params ? ` (allowed: ${(params.allowedValues as unknown[]).join(', ')})`
            : 'allowedValue' in params ? ` (must be ${JSON.stringify(params.allowedValue)})`
            : 'additionalProperty' in params ? `: ${params.additionalProperty}`
            : '';
        return `${where} ${e.message}${extra}`.trim();
    });
    return { valid: false, errors };
}
