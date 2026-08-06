const db = require('./config/db');
async function main() {
    const rows = await db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    console.log('=== TABLES ===');
    rows.forEach(r => console.log(r.name));

    console.log('\n=== accounts_studentprofile columns ===');
    try {
        const cols = await db.query("PRAGMA table_info(accounts_studentprofile)");
        cols.forEach(c => console.log(c.cid, c.name, c.type));
    } catch (e) { console.error(e.message); }

    console.log('\n=== accounts_user columns ===');
    try {
        const cols = await db.query("PRAGMA table_info(accounts_user)");
        cols.forEach(c => console.log(c.cid, c.name, c.type));
    } catch (e) { console.error(e.message); }

    process.exit(0);
}
main().catch(e => { console.error(e.message); process.exit(1); });
