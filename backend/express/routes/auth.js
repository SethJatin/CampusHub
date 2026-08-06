const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Helper to verify Django vs Express passwords
function verifyPassword(plainPassword, hashedPassword) {
    if (hashedPassword.startsWith('pbkdf2_sha256$')) {
        const parts = hashedPassword.split('$');
        const iterations = parseInt(parts[1], 10);
        const salt = parts[2];
        const hash = parts[3];

        const key = crypto.pbkdf2Sync(
            plainPassword,
            salt,
            iterations,
            32,
            'sha256'
        );
        const keyBase64 = key.toString('base64');
        return keyBase64 === hash;
    }
    return bcrypt.compareSync(plainPassword, hashedPassword);
}

// Nodemailer Helper
async function sendOTP(email, code) {
    let transporter;
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'ethereal_user_placeholder') {
        // Generate test Ethereal account
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    } else {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    const info = await transporter.sendMail({
        from: process.env.FROM_EMAIL || '"CampusHub Support" <support@campushub.edu>',
        to: email,
        subject: 'CampusHub - Account Verification OTP',
        text: `Your verification OTP code is: ${code}. It is valid for 10 minutes.`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Welcome to CampusHub!</h2>
        <p>You have registered an account on CampusHub. Please enter the following 6-digit OTP code to verify your email address:</p>
        <div style="font-size: 32px; font-weight: bold; background: #e0f2fe; padding: 15px; text-align: center; border-radius: 8px; color: #0284c7; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>This code is valid for 10 minutes. If you did not register for CampusHub, please ignore this email.</p>
      </div>
    `
    });

    if (info.host === 'smtp.ethereal.email' || !process.env.SMTP_USER || process.env.SMTP_USER === 'ethereal_user_placeholder') {
        console.log(`[VERIFICATION EMAIL SENT] OTP code: ${code} for email: ${email}`);
        console.log(`[Ethereal Mail Preview]`, nodemailer.getTestMessageUrl(info));
    }
}

// 1. REGISTER
router.post('/register', async (req, res) => {
    const { email, password, username, first_name, last_name, role, phone, address, department, roll_number, employee_id, designation } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ error: 'Email, password, and role are required' });
    }

    try {
        // Check if user already exists
        const existingUser = await db.get('SELECT * FROM accounts_user WHERE email = ?', [email]);
        if (existingUser) {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }

        const hashedPassword = bcrypt.hashSync(password, 10);
        const dateJoined = new Date().toISOString();
        const usernameVal = username || email.split('@')[0];

        // Create verification table if not exists
        await db.run(`
      CREATE TABLE IF NOT EXISTS express_verifications (
        email TEXT PRIMARY KEY,
        code TEXT,
        expires_at INTEGER
      )
    `);

        // Insert user into accounts_user
        // is_active = 1, is_verified = 1 (Auto-verified)
        const userResult = await db.run(`
      INSERT INTO accounts_user (
        password, email, username, first_name, last_name, role, is_verified,
        is_active, is_superuser, is_staff, date_joined, created_at, updated_at,
        profile_image, phone, address, bio
      ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 0, 0, ?, ?, ?, 'profiles/default.png', ?, ?, '')
    `, [hashedPassword, email, usernameVal, first_name || '', last_name || '', role, dateJoined, dateJoined, dateJoined, phone || '', address || '']);

        const userId = userResult.id;

        // Create profile tables
        if (role === 'student') {
            await db.run(`
        INSERT INTO accounts_studentprofile (user_id, roll_number, enrollment_number, department, year, semester, section, batch, cgpa, parent_name, parent_phone)
        VALUES (?, ?, ?, ?, 1, 1, '', '', 0.0, '', '')
      `, [userId, roll_number || `STU${Date.now()}`, roll_number || `ENR${Date.now()}`, department || '']);
        } else if (role === 'faculty') {
            await db.run(`
        INSERT OR IGNORE INTO accounts_facultyprofile (user_id, employee_id, department, designation, specialization, qualification, experience_years, office_location, office_hours, research_interests, publications)
        VALUES (?, ?, ?, ?, '', '', 0, '', '', '', 0)
      `, [userId, employee_id || `FAC${Date.now()}`, department || '', designation || '']);
        }

        res.status(201).json({
            message: 'Registration successful! You can now log in.',
            email
        });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ error: 'Internal Server Error during registration' });
    }
});

// 2. VERIFY OTP
router.post('/verify-otp', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    try {
        const record = await db.get('SELECT * FROM express_verifications WHERE email = ?', [email]);
        if (!record) {
            return res.status(404).json({ error: 'No verification record found for this email' });
        }

        if (record.code !== code) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        if (Date.now() > record.expires_at) {
            return res.status(400).json({ error: 'Verification code has expired' });
        }

        // Update user active status
        await db.run('UPDATE accounts_user SET is_verified = 1 WHERE email = ?', [email]);
        await db.run('DELETE FROM express_verifications WHERE email = ?', [email]);

        // Fetch updated user
        const user = await db.get('SELECT id, email, username, role, first_name, last_name FROM accounts_user WHERE email = ?', [email]);

        const secret = process.env.JWT_SECRET || 'campushub_jwt_secret_key_2026';
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role, username: user.username },
            secret,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Account verified successfully!',
            user,
            access: accessToken
        });
    } catch (err) {
        console.error('OTP Verification Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await db.get('SELECT * FROM accounts_user WHERE email = ?', [email]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!verifyPassword(password, user.password)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const secret = process.env.JWT_SECRET || 'campushub_jwt_secret_key_2026';
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role, username: user.username },
            secret,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name
            },
            access: accessToken
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 4. ME / PROFILE
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT id, email, username, role, first_name, last_name, phone, address, date_of_birth, bio, profile_image FROM accounts_user WHERE id = ?', [req.user.id]);
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await db.get('SELECT id, email, username, role, first_name, last_name, phone, address, date_of_birth, bio, profile_image FROM accounts_user WHERE id = ?', [req.user.id]);

        let profile = null;
        if (user.role === 'student') {
            profile = await db.get('SELECT * FROM accounts_studentprofile WHERE user_id = ?', [user.id]);
        } else if (user.role === 'faculty') {
            profile = await db.get('SELECT * FROM accounts_facultyprofile WHERE user_id = ?', [user.id]);
        }

        res.status(200).json({ user, profile });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/profile', authenticateToken, async (req, res) => {
    const { phone, address, bio, first_name, last_name } = req.body;
    try {
        await db.run(`
      UPDATE accounts_user
      SET phone = ?, address = ?, bio = ?, first_name = ?, last_name = ?, updated_at = ?
      WHERE id = ?
    `, [phone || '', address || '', bio || '', first_name || '', last_name || '', new Date().toISOString(), req.user.id]);

        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
