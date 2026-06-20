'use client';

import React from 'react';

/**
 * ThemePreview — a web approximation of the native `agenda_list` display.
 *
 * It reads the same theme `definition` JSON the iPad/Android clients consume
 * (docs/theme.schema.v1.json) and renders representative sample events so an
 * admin can preview a theme and recognize it in the assignment grid. It is a
 * faithful approximation, NOT the literal device renderer (the displays are
 * native SwiftUI/Compose). Unknown/missing tokens fall back to system_default
 * values, mirroring the clients' lenient decoding.
 *
 * Rendering happens on a fixed 1280x720 logical canvas, then CSS-scaled to the
 * requested `width`, so one component serves both small grid thumbnails and the
 * large inline preview at the same proportions.
 */

// ---- Loose token types (read defensively; definitions are forward-compatible) ----

type FillObject = {
    type?: string;
    color?: string;
    colors?: string[];
    start?: string;
    end?: string;
    url?: string | null;
    blurRadius?: number;
    fallback?: string;
};
type Fill = string | FillObject | null | undefined;

export interface ThemeDefinition {
    layout?: string;
    colors?: Record<string, unknown>;
    typography?: Record<string, unknown>;
    header?: Record<string, unknown>;
    components?: Record<string, unknown>;
    footer?: Record<string, unknown>;
}

// ---- system_default fallbacks (kept in lockstep with docs/themes/system_default.json) ----

const D = {
    colors: {
        background: { type: 'gradient', colors: ['#0D0F33', '#141F47', '#0D0F33'], start: 'topLeading', end: 'bottomTrailing' } as Fill,
        panel: '#141F47',
        panelOpacityPast: 0.5,
        panelBorder: '#404040',
        headerAccentBar: null as string | null,
        tickerBar: '#16213E',
        tickerText: '#FFFFFF',
        primaryText: '#FFFFFF',
        secondaryText: '#999999',
        accent: '#FFFFFF',
        currentEvent: { type: 'gradient', colors: ['#1A33CC', '#6633E6'], start: 'topLeading', end: 'bottomTrailing' } as Fill,
        currentEventText: '#FFFFFF',
        currentEventBorder: '#FFFFFF4D',
        pastEventText: '#34C759',
        dividerColor: '#FFFFFF',
        onlineColor: '#34C759',
        offlineColor: '#FF3B30',
    },
    typography: {
        scale: 1.0,
        headingSize: 32, subheadingSize: 14, clockSize: 24, dateSize: 13,
        eventTitleSize: 14, eventTimeSize: 13, eventEndTimeSize: 10,
        currentTitleSize: 18, currentTimeSize: 16, facilitatorSize: 11,
    },
    header: {
        title: null as string | null, showRoomName: true, showBuildingName: true,
        showDate: true, showClock: true, showOnlineStatus: true, logoPosition: 'none', dividers: true,
    },
    components: {
        eventRow: 'title_left_time_right', showCurrentEventHighlight: true, showFacilitator: true,
        showPastEvents: true, showTicker: false, tickerText: null as string | null,
        clockPosition: 'header_right', cornerRadius: 12, showRefreshButton: true,
    },
    footer: { show: true, showVersion: true, showTenantInfo: true },
};

const BASE_W = 1280;
const BASE_H = 720;

// ---- helpers ----

function pick<T>(obj: Record<string, unknown> | undefined, key: string, fallback: T): T {
    const v = obj?.[key];
    return v === undefined || v === null ? fallback : (v as T);
}

const GRADIENT_DIR: Record<string, string> = {
    top: 'to top', bottom: 'to bottom', leading: 'to left', trailing: 'to right',
    topLeading: 'to bottom right', topTrailing: 'to bottom left',
    bottomLeading: 'to top right', bottomTrailing: 'to top left', center: 'to bottom right',
};

/** Convert a Fill token to a CSS `background` value, honoring fallbacks. */
function fillToBackground(fill: Fill): string {
    if (!fill) return '#000000';
    if (typeof fill === 'string') return fill;
    const type = fill.type ?? 'solid';
    if (type === 'gradient' && Array.isArray(fill.colors) && fill.colors.length) {
        // CSS gradient direction is the reverse of SwiftUI start->end, but visually
        // close enough for a preview; we map start->CSS end heuristically.
        const dir = GRADIENT_DIR[fill.end ?? 'bottomTrailing'] ?? 'to bottom right';
        return `linear-gradient(${dir}, ${fill.colors.join(', ')})`;
    }
    if (type === 'image_blur') {
        // v1 preview renders the solid fallback (matches the clients' parity behavior).
        return fill.fallback ?? '#C9D2DA';
    }
    return fill.color ?? '#000000';
}

interface SampleEvent { title: string; facilitator: string | null; start: string; end: string; }

const SAMPLE_CURRENT: SampleEvent = { title: 'English Literature', facilitator: 'Mr. Thompson', start: '10:00 AM', end: '11:00 AM' };
const SAMPLE_UPCOMING: SampleEvent[] = [
    { title: 'Chemistry Lab', facilitator: 'Dr. Patel', start: '11:30 AM', end: '12:15 PM' },
    { title: 'Study Hall', facilitator: null, start: '1:00 PM', end: '2:00 PM' },
];
const SAMPLE_PAST: SampleEvent = { title: 'Morning Assembly', facilitator: 'Ms. Reyes', start: '9:00 AM', end: '9:45 AM' };

export interface ThemePreviewProps {
    definition: ThemeDefinition | null | undefined;
    /** Rendered width in px (height follows 16:9). Default 480. */
    width?: number;
    className?: string;
    /** Room/building labels shown in the header sample. */
    roomName?: string;
    buildingName?: string;
}

export default function ThemePreview({
    definition,
    width = 480,
    className,
    roomName = 'Room 121',
    buildingName = 'High School Building',
}: ThemePreviewProps) {
    const def = definition ?? {};
    const colors = (def.colors ?? {}) as Record<string, unknown>;
    const typo = (def.typography ?? {}) as Record<string, unknown>;
    const header = (def.header ?? {}) as Record<string, unknown>;
    const comps = (def.components ?? {}) as Record<string, unknown>;
    const footer = (def.footer ?? {}) as Record<string, unknown>;

    // Colors
    const background = fillToBackground(pick<Fill>(colors, 'background', D.colors.background));
    const panel = pick(colors, 'panel', D.colors.panel);
    const panelOpacityPast = pick(colors, 'panelOpacityPast', D.colors.panelOpacityPast);
    const panelBorder = pick(colors, 'panelBorder', D.colors.panelBorder);
    const headerAccentBar = pick<string | null>(colors, 'headerAccentBar', D.colors.headerAccentBar);
    const tickerBar = pick(colors, 'tickerBar', D.colors.tickerBar);
    const tickerText = pick(colors, 'tickerText', D.colors.tickerText);
    const primaryText = pick(colors, 'primaryText', D.colors.primaryText);
    const secondaryText = pick(colors, 'secondaryText', D.colors.secondaryText);
    const currentEvent = fillToBackground(pick<Fill>(colors, 'currentEvent', D.colors.currentEvent));
    const currentEventText = pick(colors, 'currentEventText', D.colors.currentEventText);
    const currentEventBorder = pick(colors, 'currentEventBorder', D.colors.currentEventBorder);
    const pastEventText = pick(colors, 'pastEventText', D.colors.pastEventText);
    const dividerColor = pick(colors, 'dividerColor', D.colors.dividerColor);
    const onlineColor = pick(colors, 'onlineColor', D.colors.onlineColor);

    // Typography (apply scale)
    const scale = pick(typo, 'scale', D.typography.scale) || 1;
    const sz = (key: keyof typeof D.typography) => pick(typo, key as string, D.typography[key]) * scale;

    // Header / components / footer toggles
    const title = pick<string | null>(header, 'title', D.header.title);
    const showRoomName = pick(header, 'showRoomName', D.header.showRoomName);
    const showBuildingName = pick(header, 'showBuildingName', D.header.showBuildingName);
    const showDate = pick(header, 'showDate', D.header.showDate);
    const showClock = pick(header, 'showClock', D.header.showClock);
    const showOnlineStatus = pick(header, 'showOnlineStatus', D.header.showOnlineStatus);
    const dividers = pick(header, 'dividers', D.header.dividers);

    const eventRow = pick(comps, 'eventRow', D.components.eventRow);
    const timeLeft = eventRow === 'time_left_title_right';
    const showFacilitator = pick(comps, 'showFacilitator', D.components.showFacilitator);
    const showPastEvents = pick(comps, 'showPastEvents', D.components.showPastEvents);
    const showTicker = pick(comps, 'showTicker', D.components.showTicker);
    const tickerTextStr = pick<string | null>(comps, 'tickerText', D.components.tickerText) || 'Welcome — please silence your phone · Visitors check in at the front desk';
    const cornerRadius = pick(comps, 'cornerRadius', D.components.cornerRadius);

    const footerShow = pick(footer, 'show', D.footer.show);
    const showVersion = pick(footer, 'showVersion', D.footer.showVersion);
    const showTenantInfo = pick(footer, 'showTenantInfo', D.footer.showTenantInfo);

    const headingText = title ?? (showRoomName ? roomName : '');

    const scaleFactor = width / BASE_W;
    const height = width * (BASE_H / BASE_W);

    // ---- sub-renderers ----

    const renderEventRow = (e: SampleEvent, opts: { past?: boolean }) => {
        const titleColor = opts.past ? pastEventText : primaryText;
        const timeColor = opts.past ? pastEventText : primaryText;
        const subColor = opts.past ? pastEventText : secondaryText;
        const titleBlock = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: sz('eventTitleSize'), fontWeight: 600, color: titleColor, fontStyle: opts.past ? 'italic' : 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</span>
                {showFacilitator && e.facilitator && (
                    <span style={{ fontSize: sz('facilitatorSize'), color: subColor, fontStyle: opts.past ? 'italic' : 'normal' }}>{e.facilitator}</span>
                )}
            </div>
        );
        const timeBlock = (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: timeLeft ? 'flex-start' : 'flex-end', gap: 1 }}>
                <span style={{ fontSize: sz('eventTimeSize'), fontWeight: 500, color: timeColor, fontStyle: opts.past ? 'italic' : 'normal' }}>{e.start}</span>
                <span style={{ fontSize: sz('eventEndTimeSize'), color: subColor, fontStyle: opts.past ? 'italic' : 'normal' }}>{e.end}</span>
            </div>
        );
        return (
            <div
                style={{
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                    padding: 16, borderRadius: cornerRadius, border: `1px solid ${panelBorder}`,
                    background: panel, opacity: opts.past ? panelOpacityPast : 1,
                }}
            >
                {timeLeft ? <>{timeBlock}{titleBlock}</> : <>{titleBlock}{timeBlock}</>}
            </div>
        );
    };

    return (
        <div
            className={className}
            style={{ width, height, overflow: 'hidden', borderRadius: 8, position: 'relative' }}
            aria-label="Theme preview"
        >
            <div
                style={{
                    width: BASE_W, height: BASE_H, transform: `scale(${scaleFactor})`, transformOrigin: 'top left',
                    background, display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: primaryText, position: 'absolute', top: 0, left: 0,
                }}
            >
                {/* Header */}
                <div style={{ padding: '32px 40px 24px' }}>
                    {dividers && <div style={{ height: 1, background: dividerColor, marginBottom: 16 }} />}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, minWidth: 0 }}>
                            {headerAccentBar && <div style={{ width: 8, alignSelf: 'stretch', background: headerAccentBar, borderRadius: 4 }} />}
                            <div style={{ minWidth: 0 }}>
                                {headingText && (
                                    <div style={{ fontSize: sz('headingSize'), fontWeight: 700, color: primaryText, lineHeight: 1.1 }}>{headingText}</div>
                                )}
                                {showBuildingName && (
                                    <div style={{ fontSize: sz('subheadingSize'), color: secondaryText, marginTop: 4 }}>{buildingName}</div>
                                )}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            {showClock && <div style={{ fontSize: sz('clockSize'), fontWeight: 700, color: primaryText }}>10:30 AM</div>}
                            {showDate && <div style={{ fontSize: sz('dateSize'), color: secondaryText }}>Friday, June 19, 2026</div>}
                            {showOnlineStatus && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 8, background: onlineColor }} />
                                    <span style={{ fontSize: 10, color: onlineColor }}>Online</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {dividers && <div style={{ height: 1, background: dividerColor, marginTop: 16 }} />}
                </div>

                {/* Body */}
                <div style={{ flex: 1, padding: '0 40px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
                    {/* NOW card */}
                    <div
                        style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                            padding: 20, borderRadius: cornerRadius + 4, background: currentEvent,
                            border: `1px solid ${currentEventBorder}`,
                        }}
                    >
                        <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: currentEventText }}>NOW</div>
                            <div style={{ fontSize: sz('currentTitleSize'), fontWeight: 700, color: currentEventText, marginTop: 6 }}>{SAMPLE_CURRENT.title}</div>
                            {showFacilitator && SAMPLE_CURRENT.facilitator && (
                                <div style={{ fontSize: sz('facilitatorSize'), color: currentEventText, opacity: 0.9, marginTop: 4 }}>{SAMPLE_CURRENT.facilitator}</div>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: sz('currentTimeSize'), fontWeight: 700, color: currentEventText }}>{SAMPLE_CURRENT.start}</div>
                            <div style={{ fontSize: sz('eventEndTimeSize'), color: currentEventText, opacity: 0.8 }}>ends {SAMPLE_CURRENT.end}</div>
                        </div>
                    </div>

                    {/* Upcoming */}
                    {SAMPLE_UPCOMING.map((e, i) => (
                        <div key={i}>{renderEventRow(e, {})}</div>
                    ))}

                    {/* Past */}
                    {showPastEvents && renderEventRow(SAMPLE_PAST, { past: true })}
                </div>

                {/* Ticker */}
                {showTicker && (
                    <div style={{ background: tickerBar, color: tickerText, padding: '10px 40px', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tickerTextStr}
                    </div>
                )}

                {/* Footer */}
                {footerShow && (
                    <div style={{ padding: '12px 40px 24px' }}>
                        <div style={{ height: 1, background: dividerColor, opacity: 0.5, marginBottom: 8 }} />
                        <div style={{ position: 'relative', textAlign: 'center', minHeight: 18 }}>
                            {showVersion && <span style={{ position: 'absolute', left: 0, fontSize: 13, color: primaryText, opacity: 0.9 }}>Ver 2.5.3</span>}
                            {showTenantInfo && <span style={{ fontSize: 13, color: primaryText, opacity: 0.9 }}>Oakwood Adventist Academy | 5378 Adventist Blvd., Huntsville AL</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
