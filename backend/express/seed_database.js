const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('--- STARTING ACADEMIC DATA SEEDING ---');

    try {
        const hashedPassword = bcrypt.hashSync('Password123!', 10);
        const dateJoined = new Date().toISOString();

        // 1. Create 5 Faculty Members
        console.log('Seeding 5 Faculty members...');
        const facultiesData = [
            { email: 'turing@campushub.edu', username: 'faculty1', first_name: 'Alan', last_name: 'Turing', emp_id: 'FAC1001', dept: 'Computer Science', desig: 'Professor' },
            { email: 'lovelace@campushub.edu', username: 'faculty2', first_name: 'Ada', last_name: 'Lovelace', emp_id: 'FAC1002', dept: 'Computer Science', desig: 'Associate Professor' },
            { email: 'codd@campushub.edu', username: 'faculty3', first_name: 'Edgar', last_name: 'Codd', emp_id: 'FAC1003', dept: 'Computer Science', desig: 'Assistant Professor' },
            { email: 'cerf@campushub.edu', username: 'faculty4', first_name: 'Vint', last_name: 'Cerf', emp_id: 'FAC1004', dept: 'Computer Science', desig: 'Professor' },
            { email: 'hamilton@campushub.edu', username: 'faculty5', first_name: 'Margaret', last_name: 'Hamilton', emp_id: 'FAC1005', dept: 'Computer Science', desig: 'Professor' }
        ];

        const facultyUserIds = [];

        for (const f of facultiesData) {
            let user = await db.get('SELECT id FROM accounts_user WHERE email = ?', [f.email]);
            let userId;
            if (!user) {
                const res = await db.run(`
                    INSERT INTO accounts_user (
                        password, email, username, first_name, last_name, role, is_verified,
                        is_active, is_superuser, is_staff, date_joined, created_at, updated_at,
                        profile_image, phone, address, bio
                    ) VALUES (?, ?, ?, ?, ?, 'faculty', 1, 1, 0, 0, ?, ?, ?, 'profiles/default.png', '', '', '')
                `, [hashedPassword, f.email, f.username, f.first_name, f.last_name, dateJoined, dateJoined, dateJoined]);
                userId = res.id;
            } else {
                userId = user.id;
            }
            facultyUserIds.push(userId);

            // Insert / ignore faculty profile
            await db.run(`
                INSERT OR IGNORE INTO accounts_facultyprofile (
                    user_id, employee_id, department, designation, specialization, qualification, experience_years, office_location, office_hours, research_interests, publications
                ) VALUES (?, ?, ?, ?, 'CS', 'Ph.D.', 10, 'Block A-301', '10 AM - 4 PM', 'Systems', 5)
            `, [userId, f.emp_id, f.dept, f.desig]);
        }
        console.log(`✓ Seeded ${facultyUserIds.length} faculty users`);

        // 2. Create 5 Courses (Subjects) assigned to the 5 Faculties
        console.log('Seeding 5 Courses/Subjects...');
        const coursesData = [
            { code: 'CS101', name: 'Programming Fundamentals', dept: 'Computer Science', credits: 4, sem: 1, instructor_id: facultyUserIds[0], room: 'Lab 1', schedule: 'Mon/Wed 09:00 AM' },
            { code: 'CS102', name: 'Data Structures & Algorithms', dept: 'Computer Science', credits: 4, sem: 2, instructor_id: facultyUserIds[1], room: 'Lab 2', schedule: 'Tue/Thu 10:30 AM' },
            { code: 'CS103', name: 'Database Management Systems', dept: 'Computer Science', credits: 3, sem: 3, instructor_id: facultyUserIds[2], room: 'Hall 101', schedule: 'Mon/Wed 11:30 AM' },
            { code: 'CS104', name: 'Computer Networks & Security', dept: 'Computer Science', credits: 4, sem: 4, instructor_id: facultyUserIds[3], room: 'Hall 202', schedule: 'Tue/Thu 02:00 PM' },
            { code: 'CS105', name: 'Software Engineering Principles', dept: 'Computer Science', credits: 3, sem: 5, instructor_id: facultyUserIds[4], room: 'Hall 303', schedule: 'Fri 10:00 AM' }
        ];

        const courseIds = [];

        for (const c of coursesData) {
            let course = await db.get('SELECT id FROM courses_course WHERE code = ?', [c.code]);
            let courseId;
            if (!course) {
                const res = await db.run(`
                    INSERT INTO courses_course (
                        code, name, description, department, credits, semester, max_students, room, schedule, status, created_at, updated_at, instructor_id
                    ) VALUES (?, ?, ?, ?, ?, ?, 60, ?, ?, 'active', ?, ?, ?)
                `, [c.code, c.name, `${c.name} core course`, c.dept, c.credits, c.sem, c.room, c.schedule, dateJoined, dateJoined, c.instructor_id]);
                courseId = res.id;
            } else {
                courseId = course.id;
                await db.run('UPDATE courses_course SET instructor_id = ? WHERE id = ?', [c.instructor_id, courseId]);
            }
            courseIds.push(courseId);
        }
        console.log(`✓ Seeded ${courseIds.length} courses`);

        // 3. Create 75 Students (5 Classes x 15 Students each)
        console.log('Seeding 75 Students (5 Classes of 15 students)...');
        const firstNames = ['Alexander', 'Beatrix', 'Calvin', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia', 'Kevin', 'Laura', 'Michael', 'Nora', 'Oscar'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];

        const studentUserIds = [];

        for (let i = 1; i <= 75; i++) {
            const fn = firstNames[(i - 1) % firstNames.length];
            const ln = lastNames[Math.floor((i - 1) / 5) % lastNames.length];
            const email = `student${i}@campushub.edu`;
            const username = `student${i}`;

            let user = await db.get('SELECT id FROM accounts_user WHERE email = ?', [email]);
            let userId;
            if (!user) {
                const res = await db.run(`
                    INSERT INTO accounts_user (
                        password, email, username, first_name, last_name, role, is_verified,
                        is_active, is_superuser, is_staff, date_joined, created_at, updated_at,
                        profile_image, phone, address, bio
                    ) VALUES (?, ?, ?, ?, ?, 'student', 1, 1, 0, 0, ?, ?, ?, 'profiles/default.png', '', '', '')
                `, [hashedPassword, email, username, fn, `${ln} #${i}`, dateJoined, dateJoined, dateJoined]);
                userId = res.id;
            } else {
                userId = user.id;
            }
            studentUserIds.push(userId);

            const rollNo = `STU2026${String(i).padStart(3, '0')}`;
            await db.run(`
                INSERT OR IGNORE INTO accounts_studentprofile (
                    user_id, roll_number, enrollment_number, department, year, semester, section, batch, cgpa, parent_name, parent_phone
                ) VALUES (?, ?, ?, 'Computer Science', 1, 1, 'A', '2026-2030', 3.8, 'Parent', '9999999999')
            `, [userId, rollNo, rollNo]);
        }
        console.log(`✓ Seeded 75 student users and profiles`);

        // 4. Enroll Students into 5 Classes (15 students per class)
        console.log('Enrolling 15 students per course...');
        for (let cIdx = 0; cIdx < 5; cIdx++) {
            const currentCourseId = courseIds[cIdx];
            const courseStudents = studentUserIds.slice(cIdx * 15, (cIdx + 1) * 15);

            for (const sId of courseStudents) {
                const existing = await db.get(
                    'SELECT id FROM courses_enrollment WHERE student_id = ? AND course_id = ?',
                    [sId, currentCourseId]
                );
                if (!existing) {
                    await db.run(`
                        INSERT INTO courses_enrollment (student_id, course_id, status, enrollment_date, approved_date, grade, marks)
                        VALUES (?, ?, 'approved', ?, ?, '', 0.0)
                    `, [sId, currentCourseId, dateJoined, dateJoined]);
                } else {
                    await db.run('UPDATE courses_enrollment SET status = "approved" WHERE id = ?', [existing.id]);
                }
            }
        }
        console.log('✓ Enrolled 15 students into each of the 5 courses');

        // 5. Seed Attendance for 5 Past Days for each Subject/Class
        console.log('Seeding 5-day past attendance records for all classes...');
        const pastDates = [
            '2026-08-01',
            '2026-08-02',
            '2026-08-03',
            '2026-08-04',
            '2026-08-05'
        ];

        let totalAttendanceRecords = 0;

        for (let cIdx = 0; cIdx < 5; cIdx++) {
            const currentCourseId = courseIds[cIdx];
            const instructorId = facultyUserIds[cIdx];
            const courseStudents = studentUserIds.slice(cIdx * 15, (cIdx + 1) * 15);

            for (const dt of pastDates) {
                const markedAt = new Date(`${dt}T10:00:00.000Z`).toISOString();
                for (let sIdx = 0; sIdx < courseStudents.length; sIdx++) {
                    const studentId = courseStudents[sIdx];
                    // Deterministic status: student indexed 13 or 14 has an absence to simulate realistic attendance variation
                    const status = (sIdx === 13 && dt === '2026-08-03') || (sIdx === 14 && (dt === '2026-08-02' || dt === '2026-08-04')) ? 'absent' : 'present';

                    const existingAtt = await db.get(
                        'SELECT id FROM courses_attendance WHERE student_id = ? AND course_id = ? AND date = ?',
                        [studentId, currentCourseId, dt]
                    );

                    if (!existingAtt) {
                        await db.run(`
                            INSERT INTO courses_attendance (student_id, course_id, date, status, marked_by_id, marked_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `, [studentId, currentCourseId, dt, status, instructorId, markedAt]);
                        totalAttendanceRecords++;
                    }
                }
            }
        }
        console.log(`✓ Seeded ${totalAttendanceRecords} attendance records (5 days x 15 students x 5 courses)`);

        console.log('\n======================================================');
        console.log('SUCCESS: Seeded 5 Faculty, 5 Courses, 75 Students, and 5-Day Attendance!');
        console.log('Faculty Login Emails: faculty1@campushub.edu ... faculty5@campushub.edu');
        console.log('Student Login Emails: student1@campushub.edu ... student75@campushub.edu');
        console.log('Default Password for all: Password123!');
        console.log('======================================================');
        process.exit(0);

    } catch (err) {
        console.error('✗ Seeding Failed:', err);
        process.exit(1);
    }
}

seed();
