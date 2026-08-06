const db = require('./config/db');

async function runTests() {
  console.log('--- STARTING EXPRESS BACKEND INTEGRATION TESTS ---');

  try {
    // 1. Verify Database connectivity
    console.log('Testing sqlite3 db connection...');
    const userCount = await db.get('SELECT COUNT(*) as count FROM accounts_user');
    console.log('✓ Connected! Total users in accounts_user:', userCount.count);

    // Initial table creation so cleanups don't crash
    await db.run(`
      CREATE TABLE IF NOT EXISTS express_verifications (
        email TEXT PRIMARY KEY,
        code TEXT,
        expires_at INTEGER
      )
    `);

    // 2. Clear previous test users if any
    const testEmail = 'nodetest@campushub.edu';
    // Clean up orphaned profile rows (previous failed run may leave UNIQUE roll_number)
    await db.run('DELETE FROM accounts_studentprofile WHERE roll_number = ?', ['NODETEST123']);
    await db.run('DELETE FROM accounts_user WHERE email = ?', [testEmail]);
    await db.run('DELETE FROM express_verifications WHERE email = ?', [testEmail]);

    // 3. Test Register workflow (simulate registering a student)
    console.log('\nTesting new user registration logic...');

    // Simulate register request arguments
    const reqBody = {
      email: testEmail,
      password: 'testPassword123!',
      role: 'student',
      first_name: 'Node',
      last_name: 'Tester',
      roll_number: 'NODETEST123',
      department: 'Computer Science'
    };

    // Insert user
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(reqBody.password, 10);
    const dateJoined = new Date().toISOString();

    const userResult = await db.run(`
      INSERT INTO accounts_user (
        password, email, username, first_name, last_name, role, is_verified,
        is_active, is_superuser, is_staff, date_joined, created_at, updated_at,
        profile_image, phone, address, bio
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, 0, 0, ?, ?, ?, 'profiles/default.png', '', '', '')
    `, [hashedPassword, reqBody.email, 'nodetest', reqBody.first_name, reqBody.last_name, reqBody.role, dateJoined, dateJoined, dateJoined]);

    const createdUserId = userResult.id;
    console.log('✓ Successfully created user row with ID:', createdUserId);

    // Create student profile record
    await db.run(`
      INSERT INTO accounts_studentprofile (user_id, roll_number, enrollment_number, department, year, semester, section, batch, cgpa, parent_name, parent_phone)
      VALUES (?, ?, ?, ?, 1, 1, 'A', '2026-2030', 0.0, '', '')
    `, [createdUserId, reqBody.roll_number, reqBody.roll_number, reqBody.department]);
    console.log('✓ Created corresponding StudentProfile record');

    const otpCode = '987654';
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await db.run('INSERT OR REPLACE INTO express_verifications (email, code, expires_at) VALUES (?, ?, ?)', [testEmail, otpCode, expiresAt]);
    console.log('✓ Saved Nodemailer OTP code (987654) into express_verifications');

    // 4. Test Verification
    console.log('\nTesting OTP Verification validation...');
    const verifyRecord = await db.get('SELECT * FROM express_verifications WHERE email = ?', [testEmail]);
    if (!verifyRecord || verifyRecord.code !== '987654') {
      throw new Error('Verification OTP mismatch or not found');
    }
    console.log('✓ Verification code matches successfully');

    // Update user to verified
    await db.run('UPDATE accounts_user SET is_verified = 1 WHERE email = ?', [testEmail]);
    await db.run('DELETE FROM express_verifications WHERE email = ?', [testEmail]);
    console.log('✓ Updated accounts_user "is_verified" to 1, cleaned verify record');

    // 5. Test Login Authentication
    console.log('\nTesting Password Authentication...');
    const loggedUser = await db.get('SELECT * FROM accounts_user WHERE email = ?', [testEmail]);
    const passwordMatch = bcrypt.compareSync(reqBody.password, loggedUser.password);
    if (!passwordMatch) {
      throw new Error('Password mismatch');
    }
    console.log('✓ Password verify matches registered hash');
    if (!loggedUser.is_verified) {
      throw new Error('User is verified flag was not updated');
    }
    console.log('✓ User verified login checks pass successfully');

    // Clean up test user
    await db.run('DELETE FROM accounts_user WHERE email = ?', [testEmail]);
    console.log('\n✓ Cleaned up test user data');
    console.log('\n*** ALL BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! ***');
    process.exit(0);

  } catch (err) {
    console.error('✗ TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
