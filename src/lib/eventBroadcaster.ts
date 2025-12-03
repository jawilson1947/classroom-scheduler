// Event broadcaster for real-time updates via Server-Sent Events (SSE)

type EventType = 'event_created' | 'event_updated' | 'event_deleted' | 'room_updated';

interface BroadcastMessage {
    type: EventType;
    data: any;
    timestamp: number;
}

class EventBroadcaster {
    private clients: Map<string, ReadableStreamDefaultController> = new Map();

    // Add a new SSE client
    addClient(clientId: string, controller: ReadableStreamDefaultController) {
        this.clients.set(clientId, controller);
        console.log(`[SSE] Client connected: ${clientId}. Total clients: ${this.clients.size}`);
    }

    // Remove a disconnected client
    removeClient(clientId: string) {
        this.clients.delete(clientId);
        console.log(`[SSE] Client disconnected: ${clientId}. Total clients: ${this.clients.size}`);
    }

    // Broadcast a message to all connected clients
    broadcast(type: EventType, data: any) {
        const message: BroadcastMessage = {
            type,
            data,
            timestamp: Date.now()
        };

        const messageString = `data: ${JSON.stringify(message)}\n\n`;

        console.log(`[SSE] Broadcasting ${type} to ${this.clients.size} clients`);

        // Send to all connected clients
        this.clients.forEach((controller, clientId) => {
            try {
                controller.enqueue(new TextEncoder().encode(messageString));
            } catch (error) {
                console.error(`[SSE] Error sending to client ${clientId}:`, error);
                this.removeClient(clientId);
            }
        });
    }

    // Send a message to a specific client
    sendToClient(clientId: string, type: EventType, data: any) {
        const controller = this.clients.get(clientId);
        if (!controller) return;

        const message: BroadcastMessage = {
            type,
            data,
            timestamp: Date.now()
        };

        const messageString = `data: ${JSON.stringify(message)}\n\n`;

        try {
            controller.enqueue(new TextEncoder().encode(messageString));
        } catch (error) {
            console.error(`[SSE] Error sending to client ${clientId}:`, error);
            this.removeClient(clientId);
        }
    }

    // Get the number of connected clients
    getClientCount() {
        return this.clients.size;
    }
}

// Singleton instance
const broadcaster = new EventBroadcaster();

export default broadcaster;
