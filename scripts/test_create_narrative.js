const http = require('http');

const eventData = JSON.stringify({
    tenant_id: 1,
    room_id: 7,
    title: "Narrative Test Event",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    description: "Testing narrative",
    event_type: "class",
    narrative: "<p>This is a <strong>rich text</strong> narrative.</p>",
    force: true
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/events',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': eventData.length
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Body:', data);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(eventData);
req.end();
