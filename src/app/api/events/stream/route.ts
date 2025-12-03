import { NextRequest } from 'next/server';
import broadcaster from '@/lib/eventBroadcaster';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // Authenticate the request
    const session = await auth();
    if (!session) {
        return new Response('Unauthorized', { status: 401 });
    }

    const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create a readable stream for SSE
    const stream = new ReadableStream({
        start(controller) {
            // Add client to broadcaster
            broadcaster.addClient(clientId, controller);

            // Send initial connection message
            const welcomeMessage = `data: ${JSON.stringify({
                type: 'connected',
                clientId,
                timestamp: Date.now()
            })}\n\n`;
            controller.enqueue(new TextEncoder().encode(welcomeMessage));

            // Send heartbeat every 30 seconds to keep connection alive
            const heartbeatInterval = setInterval(() => {
                try {
                    const heartbeat = `: heartbeat\n\n`;
                    controller.enqueue(new TextEncoder().encode(heartbeat));
                } catch (error) {
                    console.error('[SSE] Heartbeat error:', error);
                    clearInterval(heartbeatInterval);
                    broadcaster.removeClient(clientId);
                }
            }, 30000);

            // Cleanup on disconnect
            request.signal.addEventListener('abort', () => {
                clearInterval(heartbeatInterval);
                broadcaster.removeClient(clientId);
                try {
                    controller.close();
                } catch (error) {
                    // Controller already closed
                }
            });
        },
        cancel() {
            broadcaster.removeClient(clientId);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable buffering for nginx
        },
    });
}
