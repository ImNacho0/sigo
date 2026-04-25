const http = require('http');

http.get('http://127.0.0.1:5173/auth/profile', {
    headers: {
        'Cookie': 'UCO_SESSION=UCO-5R2UXPP9MPTE'
    }
}, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data));
}).on('error', (err) => console.log('ERROR:', err.message));
