const fs = require('fs');
const https = require('https');

const url = 'https://raw.githubusercontent.com/vinhtran2611/KieuGPT/main/truyenkieu.txt';
const dest = 'e:\\Bookigma\\Bookigma\\bookigma\\backend\\bookigma\\src\\main\\resources\\truyen_kieu.txt';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        // Just take the first 3000 lines or so if it's too long, but Truyện Kiều is 3254 verses.
        fs.writeFileSync(dest, data, 'utf-8');
        console.log('Downloaded Truyện Kiều successfully to resources!');
    });
}).on('error', (err) => {
    console.error('Error downloading:', err.message);
});
