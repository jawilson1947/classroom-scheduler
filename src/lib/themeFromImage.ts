// Client-only helpers to derive a starting display theme from an image or PDF.
// Renders/loads the source to a downscaled canvas, extracts a color palette with
// node-vibrant, and maps it onto theme tokens (with contrast-aware text). The
// downscaled image is embedded as the blurred background (image_blur) data URI.
//
// All functions use the browser canvas + dynamic imports, so call them only on the
// client (e.g. from an event handler in a 'use client' component).

import type { ThemeDefinition } from '@/components/ThemePreview';

const MAX_DIM = 1280; // cap longest edge to keep the embedded data URI small

// ---- color helpers ---------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '').slice(0, 6);
    const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r: number, g: number, b: number): string {
    const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
// Relative luminance (0 = black, 1 = white).
function luminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function mix(a: string, b: string, t: number): string {
    const [ar, ag, ab] = hexToRgb(a);
    const [br, bg, bb] = hexToRgb(b);
    return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}
function readableText(bg: string): string {
    return luminance(bg) < 0.5 ? '#FFFFFF' : '#111111';
}

// ---- source → downscaled canvas -------------------------------------------
function fit(w: number, h: number): { w: number; h: number; scale: number } {
    const scale = Math.min(1, MAX_DIM / Math.max(w, h));
    return { w: Math.round(w * scale), h: Math.round(h * scale), scale };
}

async function imageFileToCanvas(file: File): Promise<HTMLCanvasElement> {
    const url = URL.createObjectURL(file);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const { w, h } = fit(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        return canvas;
    } finally {
        URL.revokeObjectURL(url);
    }
}

async function pdfFirstPageToCanvas(file: File): Promise<HTMLCanvasElement> {
    const pdfjs = await import('pdfjs-dist');
    // Pin the worker to a CDN build matching the installed pdfjs version. This avoids
    // bundler worker-resolution differences across Next/Turbopack setups. (If your
    // deployment uses a strict CSP, allow worker-src/script-src for cdn.jsdelivr.net,
    // or swap this for a self-hosted copy of pdf.worker.min.mjs.)
    pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const data = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_DIM / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d')!;
    // White matte behind transparent PDFs so the background isn't black.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
    return canvas;
}

// ---- palette → theme definition -------------------------------------------
interface Sw { hex: string; pop: number }
function sw(s: any): Sw | null {
    return s && typeof s.hex === 'string' ? { hex: s.hex.toUpperCase(), pop: s.population ?? 0 } : null;
}

function buildDefinition(palette: Record<string, any>, bgDataUrl: string): ThemeDefinition {
    const vibrant = sw(palette.Vibrant);
    const darkVibrant = sw(palette.DarkVibrant);
    const lightVibrant = sw(palette.LightVibrant);
    const muted = sw(palette.Muted);
    const darkMuted = sw(palette.DarkMuted);

    const bgBase = (darkMuted ?? darkVibrant ?? muted)?.hex ?? '#0D0F33';
    const fallback = bgBase;
    const dark = luminance(fallback) < 0.5;
    const primaryText = readableText(fallback);
    const secondaryText = dark ? mix(primaryText, fallback, 0.4) : mix(primaryText, fallback, 0.35);
    const panel = mix(fallback, dark ? '#000000' : '#FFFFFF', 0.35);
    const panelBorder = mix(panel, primaryText, 0.2);
    const accent = (vibrant ?? lightVibrant ?? muted)?.hex ?? '#FFFFFF';
    const nowA = vibrant?.hex ?? accent;
    const nowB = darkVibrant?.hex ?? muted?.hex ?? mix(nowA, '#000000', 0.3);

    return {
        schemaVersion: 1,
        layout: 'agenda_list',
        colors: {
            background: { type: 'image_blur', url: bgDataUrl, blurRadius: 24, fallback },
            panel,
            panelBorder,
            primaryText,
            secondaryText,
            accent,
            currentEvent: { type: 'gradient', colors: [nowA, nowB], start: 'topLeading', end: 'bottomTrailing' },
            currentEventText: readableText(nowA),
            dividerColor: primaryText,
        },
    } as unknown as ThemeDefinition;
}

// ---- public entry ----------------------------------------------------------
export interface GeneratedTheme {
    definition: ThemeDefinition;
    suggestedName: string;
}

/** Build a starting theme definition from an image (JPEG/PNG) or PDF file. */
export async function generateThemeFromFile(file: File): Promise<GeneratedTheme> {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage = /^image\/(png|jpe?g)$/.test(file.type) || /\.(png|jpe?g)$/i.test(file.name);
    if (!isPdf && !isImage) {
        throw new Error('Please choose a PNG, JPEG, or PDF file.');
    }

    const canvas = isPdf ? await pdfFirstPageToCanvas(file) : await imageFileToCanvas(file);
    // JPEG keeps the embedded data URI small; quality 0.82 is plenty for a blurred bg.
    const bgDataUrl = canvas.toDataURL('image/jpeg', 0.82);

    const { Vibrant } = await import('node-vibrant/browser');
    const palette = await Vibrant.from(bgDataUrl).getPalette();

    const base = file.name.replace(/\.[^.]+$/, '').trim() || 'Image';
    return {
        definition: buildDefinition(palette as Record<string, any>, bgDataUrl),
        suggestedName: `Theme from ${base}`,
    };
}
