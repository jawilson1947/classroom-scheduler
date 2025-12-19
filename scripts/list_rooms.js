const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/rooms?tenant_id=1',
    method: 'GET',
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const rooms = JSON.parse(data);
            console.log('Rooms:', rooms.map(r => ({ id: r.id, name: r.name })));
        } catch (e) {
            console.error(data);
        }
    });
});
req.end();
