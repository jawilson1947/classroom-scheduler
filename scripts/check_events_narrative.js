const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/events?tenant_id=1',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const events = JSON.parse(data);
            console.log('Events found:', events.length);
            events.forEach(e => {
                if (e.narrative) {
                    console.log(`Event ID ${e.id} has narrative:`, e.narrative.substring(0, 50) + '...');
                } else {
                    console.log(`Event ID ${e.id} - narrative is ${e.narrative}`);
                }
            });
        } catch (e) {
            console.error(e.message);
        }
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
