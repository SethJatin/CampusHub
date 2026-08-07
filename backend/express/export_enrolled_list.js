const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function generateList() {
    const courses = await db.query(`
        SELECT c.id, c.code, c.name as course_name, c.department, c.schedule, c.room,
               u.first_name as fac_first_name, u.last_name as fac_last_name, u.email as fac_email, u.username as fac_username
        FROM courses_course c
        LEFT JOIN accounts_user u ON c.instructor_id = u.id
        ORDER BY c.code ASC
    `);

    let textContent = '=================================================================================\n';
    textContent += '                   CAMPUSHUB - FACULTY & ENROLLED STUDENTS LIST\n';
    textContent += '=================================================================================\n\n';

    for (const course of courses) {
        const facultyName = course.fac_first_name ? `Prof. ${course.fac_first_name} ${course.fac_last_name}` : 'Unassigned';
        textContent += `COURSE CODE : ${course.code}\n`;
        textContent += `SUBJECT NAME: ${course.course_name}\n`;
        textContent += `FACULTY     : ${facultyName} (${course.fac_email || 'N/A'})\n`;
        textContent += `SCHEDULE    : ${course.schedule} | Room: ${course.room}\n`;
        textContent += '---------------------------------------------------------------------------------\n';
        textContent += ' S.No | Roll Number  | Student Name                      | Email Address\n';
        textContent += '---------------------------------------------------------------------------------\n';

        const students = await db.query(`
            SELECT u.id, u.first_name, u.last_name, u.email, sp.roll_number
            FROM courses_enrollment e
            JOIN accounts_user u ON e.student_id = u.id
            LEFT JOIN accounts_studentprofile sp ON u.id = sp.user_id
            WHERE e.course_id = ? AND e.status = 'approved'
            ORDER BY u.id ASC
        `, [course.id]);

        students.forEach((s, idx) => {
            const sNo = String(idx + 1).padStart(4, ' ');
            const rollNo = (s.roll_number || `STU${s.id}`).padEnd(12, ' ');
            const name = `${s.first_name} ${s.last_name}`.padEnd(33, ' ');
            const email = s.email;
            textContent += ` ${sNo} | ${rollNo} | ${name} | ${email}\n`;
        });

        textContent += '---------------------------------------------------------------------------------\n';
        textContent += ` Total Enrolled Students: ${students.length}\n`;
        textContent += '=================================================================================\n\n';
    }

    const outputPath = path.resolve(__dirname, '..', '..', 'enrolled_students_faculty_list.txt');
    fs.writeFileSync(outputPath, textContent, 'utf-8');
    console.log('Successfully generated text file at:', outputPath);
}

generateList().catch(console.error);
