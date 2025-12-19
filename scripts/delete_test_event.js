const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/events?id=40',
    method: 'DELETE',
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
