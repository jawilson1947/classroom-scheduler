'use client';

import { useState, useEffect, useRef } from 'react';
import ThemePreview, { ThemeDefinition } from '@/components/ThemePreview';
import { generateThemeFromFile } from '@/lib/themeFromImage';

export interface EditableTheme {
    id: number;
    tenant_id: number | null;
    key_name: string;
    name: string;
    description: string | null;
    definition: ThemeDefinition;
    is_system: boolean;
}

interface Template { name: string; definition: ThemeDefinition; }

interface ThemeEditorProps {
    mode: 'create' | 'edit';
    initial?: EditableTheme | null;
    role: string;
    /** The org context: own tenant for ORG_ADMIN, selected org for SYSTEM_ADMIN. */
    tenantId: number | null;
    tenantName?: string;
    /** Existing themes offered as starting points when creating. */
    templates: Template[];
    onClose: () => void;
    onSaved: () => void;
}

const BLANK: ThemeDefinition = { schemaVersion: 1, layout: 'agenda_list' } as ThemeDefinition;

function deriveKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 64);
}

export default function ThemeEditor({ mode, initial, role, tenantId, tenantName, templates, onClose, onSaved }: ThemeEditorProps) {
    const isEdit = mode === 'edit';
    const canChooseGlobal = role === 'SYSTEM_ADMIN';

    const [name, setName] = useState(initial?.name ?? '');
    const [keyName, setKeyName] = useState(initial?.key_name ?? '');
    const [keyTouched, setKeyTouched] = useState(isEdit);
    const [description, setDescription] = useState(initial?.description ?? '');
    const [scope, setScope] = useState<'global' | 'tenant'>(
        isEdit ? (initial?.tenant_id == null ? 'global' : 'tenant') : (canChooseGlobal ? 'global' : 'tenant')
    );
    const [jsonText, setJsonText] = useState(
        JSON.stringify(initial?.definition ?? BLANK, null, 2)
    );

    const [parsed, setParsed] = useState<ThemeDefinition | null>(initial?.definition ?? BLANK);
    const [parseError, setParseError] = useState<string | null>(null);
    const [schemaErrors, setSchemaErrors] = useState<string[]>([]);
    const [validating, setValidating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [genBusy, setGenBusy] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Parse + debounced schema validation as the JSON changes.
    useEffect(() => {
        let def: ThemeDefinition | null = null;
        try {
            def = JSON.parse(jsonText);
            setParseError(null);
            setParsed(def);
        } catch (e) {
            setParseError((e as Error).message);
            return; // keep last good `parsed` for the preview
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setValidating(true);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch('/api/themes/validate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ definition: def }),
                });
                const data = await res.json();
                setSchemaErrors(data.valid ? [] : (data.errors ?? ['Validation failed']));
            } catch {
                setSchemaErrors([]); // network hiccup — don't block; server re-validates on save
            } finally {
                setValidating(false);
            }
        }, 450);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [jsonText]);

    const onNameChange = (v: string) => {
        setName(v);
        if (!isEdit && !keyTouched) setKeyName(deriveKey(v));
    };

    const applyTemplate = (idx: number) => {
        const def = idx < 0 ? BLANK : templates[idx]?.definition ?? BLANK;
        setJsonText(JSON.stringify(def, null, 2));
    };

    // Build a starting theme (palette + blurred background) from an image or PDF.
    const handleGenerateFromFile = async (file?: File) => {
        if (!file) return;
        setGenBusy(true);
        setGenError(null);
        try {
            const { definition, suggestedName } = await generateThemeFromFile(file);
            setJsonText(JSON.stringify(definition, null, 2));
            if (!name.trim()) {
                setName(suggestedName);
                if (!keyTouched) setKeyName(deriveKey(suggestedName));
            }
        } catch (e) {
            setGenError((e as Error).message || 'Could not build a theme from that file.');
        } finally {
            setGenBusy(false);
        }
    };

    const canSave =
        !parseError && schemaErrors.length === 0 && !validating && !saving &&
        name.trim().length > 0 && (isEdit || /^[a-z0-9_]{1,64}$/.test(keyName));

    const handleSave = async () => {
        if (!parsed) return;
        setSaving(true);
        setSaveError(null);
        try {
            const tenant_id = scope === 'global' ? null : tenantId;
            const res = await fetch('/api/themes', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    isEdit
                        ? { id: initial!.id, name, description, definition: parsed }
                        : { key_name: keyName, name, description, definition: parsed, tenant_id }
                ),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const detail = Array.isArray(data.details) ? `: ${data.details.join('; ')}` : '';
                throw new Error((data.error || 'Save failed') + detail);
            }
            onSaved();
            onClose();
        } catch (e) {
            setSaveError((e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[92vh] overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{isEdit ? `Edit theme — ${initial?.name}` : 'New theme'}</h3>
                    <button onClick={onClose} className="bg-slate-200 hover:bg-slate-300 px-4 py-2 rounded-lg font-semibold text-sm">Close</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Left: form + JSON */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input className="w-full border p-2 rounded" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g., Lobby Light" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Key {isEdit && <span className="text-slate-400">(fixed)</span>}</label>
                                <input
                                    className="w-full border p-2 rounded disabled:bg-slate-100 disabled:text-slate-500 font-mono text-sm"
                                    value={keyName}
                                    onChange={(e) => { setKeyTouched(true); setKeyName(e.target.value); }}
                                    disabled={isEdit}
                                    placeholder="lobby_light"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                            <input className="w-full border p-2 rounded" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
                        </div>

                        {!isEdit && (
                            <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Scope</label>
                                    <select
                                        className="w-full border p-2 rounded bg-white disabled:bg-slate-100"
                                        value={scope}
                                        onChange={(e) => setScope(e.target.value as 'global' | 'tenant')}
                                        disabled={!canChooseGlobal}
                                    >
                                        {canChooseGlobal && <option value="global">Global (all organizations)</option>}
                                        <option value="tenant">{tenantName ? `${tenantName} only` : 'This organization only'}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start from</label>
                                    <select className="w-full border p-2 rounded bg-white" defaultValue="" onChange={(e) => applyTemplate(Number(e.target.value))}>
                                        <option value="-1">Blank</option>
                                        {templates.map((t, i) => <option key={i} value={i}>{t.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Create from image or PDF</label>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,application/pdf"
                                    disabled={genBusy}
                                    onChange={(e) => handleGenerateFromFile(e.target.files?.[0])}
                                    className="w-full text-sm border rounded p-2 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                                />
                                <p className="text-xs mt-1">
                                    {genBusy
                                        ? <span className="text-slate-500">Analyzing…</span>
                                        : genError
                                            ? <span className="text-red-600">{genError}</span>
                                            : <span className="text-slate-400">Derives a color palette and blurred background. Best results: a landscape image ~1280–1920px on the long edge, with a few strong colors (mostly-white files give a pale palette; only a PDF&apos;s first page is used). The image shows on the displays; the preview shows the fallback color.</span>}
                                </p>
                            </div>
                            </>
                        )}

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-700">Definition (JSON)</label>
                                <span className="text-xs">
                                    {parseError ? <span className="text-red-600">Invalid JSON</span>
                                        : validating ? <span className="text-slate-400">Validating…</span>
                                        : schemaErrors.length === 0 ? <span className="text-green-600">✓ Valid</span>
                                        : <span className="text-red-600">{schemaErrors.length} schema issue(s)</span>}
                                </span>
                            </div>
                            <textarea
                                className="w-full border rounded p-2 font-mono text-xs h-72 leading-relaxed"
                                spellCheck={false}
                                value={jsonText}
                                onChange={(e) => setJsonText(e.target.value)}
                            />
                        </div>

                        {(parseError || schemaErrors.length > 0) && (
                            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-800 max-h-32 overflow-auto">
                                {parseError ? <div>JSON parse error: {parseError}</div> : (
                                    <ul className="list-disc pl-4 space-y-0.5">
                                        {schemaErrors.map((er, i) => <li key={i}>{er}</li>)}
                                    </ul>
                                )}
                            </div>
                        )}
                        {saveError && <div className="bg-red-100 text-red-800 px-3 py-2 rounded text-sm">{saveError}</div>}
                    </div>

                    {/* Right: live preview */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Live preview</label>
                        <div className="bg-slate-900 rounded-lg p-3 flex justify-center">
                            <ThemePreview definition={parsed} width={460} />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Approximate web preview — live displays render natively on iPad / Android.</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-5">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={!canSave}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create theme'}
                    </button>
                </div>
            </div>
        </div>
    );
}
