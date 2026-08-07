const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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

        // Insert user into accounts_user (is_active = 1, is_verified = 1)
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
    const { phone, address, bio, first_name, last_name, profile_image } = req.body;
    try {
        await db.run(`
            UPDATE accounts_user
            SET phone = ?, address = ?, bio = ?, first_name = ?, last_name = ?, profile_image = ?, updated_at = ?
            WHERE id = ?
        `, [
            phone || '',
            address || '',
            bio || '',
            first_name || '',
            last_name || '',
            profile_image || 'profiles/default.png',
            new Date().toISOString(),
            req.user.id
        ]);

        res.status(200).json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error('Update Profile Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 5. CHANGE PASSWORD
router.post('/change-password', authenticateToken, async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    try {
        const user = await db.get('SELECT * FROM accounts_user WHERE id = ?', [req.user.id]);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!verifyPassword(current_password, user.password)) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const hashedNewPassword = bcrypt.hashSync(new_password, 10);
        await db.run(`
            UPDATE accounts_user
            SET password = ?, updated_at = ?
            WHERE id = ?
        `, [hashedNewPassword, new_dateJoined = new Date().toISOString(), req.user.id]);

        res.status(200).json({ message: 'Password changed successfully!' });
    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
