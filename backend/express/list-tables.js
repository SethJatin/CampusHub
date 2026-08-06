const db = require('./config/db');
db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .then(rows => { rows.forEach(r => console.log(r.name)); process.exit(0); })
    .catch(e => { console.error(e.message); process.exit(1); });
