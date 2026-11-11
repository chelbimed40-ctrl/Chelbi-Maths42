const http = require('http');
fetch('http://127.0.0.1:3000/api/student/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: "1e95b460906ec2b2d5dddae2b12c0da1", name: "تلميذ ذكي" })
}).then(async r => console.log(r.status, await r.text())).catch(console.error);
