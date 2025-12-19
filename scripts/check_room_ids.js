const http = require('http');

function fetchData(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function check() {
    try {
        console.log('Fetching Rooms...');
        const rooms = await fetchData('/api/rooms?tenant_id=1');
        console.log(`Fetched ${rooms.length} rooms.`);
        if (rooms.length > 0) {
            console.log('Sample Room ID:', rooms[0].id, 'Type:', typeof rooms[0].id);
        }

        console.log('Fetching Events...');
        const events = await fetchData('/api/events?tenant_id=1');
        console.log(`Fetched ${events.length} events.`);

        if (events.length > 0) {
            console.log('Sample Event Room ID:', events[0].room_id, 'Type:', typeof events[0].room_id);

            // Check matches
            let matches = 0;
            events.forEach(e => {
                const updatedRoomId = e.room_id; // Check if we need to cast?
                const room = rooms.find(r => r.id == updatedRoomId); // soft match check first
                if (room) matches++;
                else console.log(`No match for Event ID ${e.id} with Room ID ${e.room_id}`);
            });
            console.log(`Total Matches: ${matches} / ${events.length}`);
        }
    } catch (e) {
        console.error(e);
    }
}

check();
