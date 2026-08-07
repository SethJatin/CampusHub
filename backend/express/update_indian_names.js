const fs = require('fs');
const path = require('path');
const db = require('./config/db');

async function updateAndExport() {
    console.log('--- UPDATING NAMES TO INDIAN ORIGIN ---');

    // 1. Update 5 Faculty Names
    const indianFaculties = [
        { email: 'turing@campushub.edu', first_name: 'Rajesh', last_name: 'Sharma' },
        { email: 'lovelace@campushub.edu', first_name: 'Priya', last_name: 'Nambiar' },
        { email: 'codd@campushub.edu', first_name: 'Amitava', last_name: 'Roy' },
        { email: 'cerf@campushub.edu', first_name: 'Sunita', last_name: 'Kulkarni' },
        { email: 'hamilton@campushub.edu', first_name: 'Vikram', last_name: 'Mehta' }
    ];

    for (const f of indianFaculties) {
        await db.run('UPDATE accounts_user SET first_name = ?, last_name = ? WHERE email = ?', [f.first_name, f.last_name, f.email]);
    }
    console.log('✓ Updated 5 Faculty members with Indian names');

    // 2. Update 75 Student Names
    const indianFirstNames = [
        'Aarav', 'Ananya', 'Rohan', 'Ishaan', 'Diya', 'Kabir', 'Vihaan', 'Saisha', 'Aditya', 'Meera',
        'Arjun', 'Kavya', 'Dev', 'Anvi', 'Siddharth', 'Riya', 'Reyansh', 'Tanvi', 'Yash', 'Avani',
        'Aryan', 'Navya', 'Pranav', 'Sneha', 'Parth', 'Aditi', 'Krishna', 'Ishita', 'Varun', 'Shreya',
        'Sameer', 'Pooja', 'Harish', 'Neha', 'Karan', 'Swati', 'Nikhil', 'Tarun', 'Radhika', 'Vivek',
        'Priyanka', 'Rahul', 'Simran', 'Gautam', 'Divya', 'Manish', 'Deepak', 'Srishti', 'Alok', 'Bhavna',
        'Chetan', 'Geeta', 'Hemant', 'Indira', 'Jayesh', 'Kiran', 'Madhav', 'Neeraj', 'Omkar', 'Payal',
        'Rakesh', 'Sandeep', 'Trupti', 'Utkarsh', 'Vandana', 'Wasim', 'Yamini', 'Yogesh', 'Abhinav', 'Bhuvan',
        'Chaitra', 'Darshan', 'Esha', 'Farhan', 'Gaurav'
    ];

    const indianLastNames = [
        'Sharma', 'Verma', 'Gupta', 'Patel', 'Reddy', 'Joshi', 'Kulkarni', 'Mehta', 'Rao', 'Nair',
        'Roy', 'Sengupta', 'Das', 'Chatterjee', 'Iyer', 'Agarwal', 'Jain', 'Mishra', 'Pandey', 'Deshmukh',
        'Bhat', 'Hegde', 'Singh', 'Choudhury', 'Saxena'
    ];

    for (let i = 1; i <= 75; i++) {
        const email = `student${i}@campushub.edu`;
        const fn = indianFirstNames[i - 1];
        const ln = indianLastNames[(i - 1) % indianLastNames.length];
        await db.run('UPDATE accounts_user SET first_name = ?, last_name = ? WHERE email = ?', [fn, ln, email]);
    }
    console.log('✓ Updated 75 Students with Indian names');

    // 3. Export to enrolled_students_faculty_list.txt
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
    console.log('Successfully updated text file at:', outputPath);
}

updateAndExport().catch(console.error);
