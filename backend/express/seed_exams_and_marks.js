const db = require('./config/db');

async function initAndSeedExams() {
    console.log('--- INITIALIZING EXAMS, MARKS & ANALYTICAL DATA ---');

    try {
        // 1. Create Tables
        await db.run(`
            CREATE TABLE IF NOT EXISTS courses_exam (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                title VARCHAR(200) NOT NULL,
                exam_date DATETIME NOT NULL,
                duration_minutes INTEGER DEFAULT 90,
                total_marks DECIMAL NOT NULL DEFAULT 100.0,
                syllabus TEXT,
                exam_pattern TEXT,
                status VARCHAR(20) DEFAULT 'scheduled',
                created_at DATETIME,
                created_by_id INTEGER,
                FOREIGN KEY (course_id) REFERENCES courses_course (id)
            )
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS courses_examquestion (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a VARCHAR(200),
                option_b VARCHAR(200),
                option_c VARCHAR(200),
                option_d VARCHAR(200),
                correct_option VARCHAR(10),
                marks DECIMAL DEFAULT 10.0,
                FOREIGN KEY (exam_id) REFERENCES courses_exam (id) ON DELETE CASCADE
            )
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS courses_examsubmission (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                submitted_at DATETIME,
                status VARCHAR(20) DEFAULT 'submitted',
                answers_json TEXT,
                FOREIGN KEY (exam_id) REFERENCES courses_exam (id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES accounts_user (id) ON DELETE CASCADE
            )
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS courses_exammark (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exam_id INTEGER NOT NULL,
                student_id INTEGER NOT NULL,
                marks_obtained DECIMAL NOT NULL,
                total_marks DECIMAL NOT NULL DEFAULT 100.0,
                remarks TEXT,
                evaluated_at DATETIME,
                evaluated_by_id INTEGER,
                FOREIGN KEY (exam_id) REFERENCES courses_exam (id) ON DELETE CASCADE,
                FOREIGN KEY (student_id) REFERENCES accounts_user (id) ON DELETE CASCADE
            )
        `);

        console.log('✓ Exam tables created successfully');

        // Clear existing exam data for clean seeding
        await db.run('DELETE FROM courses_exammark');
        await db.run('DELETE FROM courses_examsubmission');
        await db.run('DELETE FROM courses_examquestion');
        await db.run('DELETE FROM courses_exam');

        // Fetch 5 core courses
        const courses = await db.query('SELECT * FROM courses_course ORDER BY code ASC');
        if (courses.length === 0) {
            console.error('No courses found to seed exams!');
            process.exit(1);
        }

        const dateNow = new Date().toISOString();

        for (const course of courses) {
            // Exam 1: Mid-Term Exam (Completed & Graded)
            const midTermRes = await db.run(`
                INSERT INTO courses_exam (
                    course_id, title, exam_date, duration_minutes, total_marks,
                    syllabus, exam_pattern, status, created_at, created_by_id
                ) VALUES (?, ?, ?, 90, 100.0, ?, ?, 'completed', ?, ?)
            `, [
                course.id,
                `${course.code} - Mid-Term Examination 2026`,
                '2026-07-25T10:00:00.000Z',
                `Unit 1: Introduction & Fundamentals of ${course.name}\nUnit 2: Core Concepts, Models & Implementations`,
                `Section A: 10 MCQs (20 Marks)\nSection B: 4 Short Answer Questions (40 Marks)\nSection C: 2 Problem Solving Tasks (40 Marks)`,
                dateNow,
                course.instructor_id
            ]);

            const midTermId = midTermRes.id;

            // Exam 2: Upcoming Final Exam (Scheduled)
            const finalRes = await db.run(`
                INSERT INTO courses_exam (
                    course_id, title, exam_date, duration_minutes, total_marks,
                    syllabus, exam_pattern, status, created_at, created_by_id
                ) VALUES (?, ?, ?, 120, 100.0, ?, ?, 'scheduled', ?, ?)
            `, [
                course.id,
                `${course.code} - End-Semester Final Examination 2026`,
                '2026-08-28T09:30:00.000Z',
                `Comprehensive Syllabus (Units 1 to 5)\nAdvanced Case Studies & System Architecture`,
                `Section A: 20 MCQs (40 Marks)\nSection B: 3 Comprehensive Analytical Questions (60 Marks)`,
                dateNow,
                course.instructor_id
            ]);

            const finalId = finalRes.id;

            // Add Questions for the Upcoming Exam
            const sampleQuestions = [
                {
                    question_text: `What is the primary core objective of ${course.name}?`,
                    option_a: 'Optimizing resource utilization & algorithmic throughput',
                    option_b: 'Bypassing memory allocations',
                    option_c: 'Hardcoding static configuration files',
                    option_d: 'None of the above',
                    correct_option: 'A',
                    marks: 25.0
                },
                {
                    question_text: `Which architectural pattern is recommended for scalable deployment in ${course.code}?`,
                    option_a: 'Monolithic single-process architecture',
                    option_b: 'Decoupled modular architecture with API endpoints',
                    option_c: 'Unstructured procedural script execution',
                    option_d: 'Manual paper register entry',
                    correct_option: 'B',
                    marks: 25.0
                },
                {
                    question_text: `What is the time complexity of efficient search in structured index tables?`,
                    option_a: 'O(N^2)',
                    option_b: 'O(N!)',
                    option_c: 'O(log N)',
                    option_d: 'O(2^N)',
                    correct_option: 'C',
                    marks: 25.0
                },
                {
                    question_text: `How do you ensure transactional integrity across database state changes?`,
                    option_a: 'Using ACID properties & commit transactions',
                    option_b: 'Ignoring exception handling',
                    option_c: 'Writing directly to temporary unverified buffers',
                    option_d: 'Restarting server on every query',
                    correct_option: 'A',
                    marks: 25.0
                }
            ];

            for (const q of sampleQuestions) {
                await db.run(`
                    INSERT INTO courses_examquestion (
                        exam_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [finalId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.marks]);
            }

            // Fetch enrolled students for this course
            const enrollments = await db.query(`
                SELECT student_id FROM courses_enrollment WHERE course_id = ? AND status = 'approved'
            `, [course.id]);

            // Seed marks for Mid-Term exam for all enrolled students
            for (let i = 0; i < enrollments.length; i++) {
                const sId = enrollments[i].student_id;
                // Generate realistic marks between 65 and 98
                const baseMarks = 68 + ((sId * 7 + course.id * 13) % 29);
                const marksObtained = Math.min(100, Math.max(55, baseMarks));
                const remark = marksObtained >= 85 ? 'Outstanding Performance' : marksObtained >= 75 ? 'Good Academic Progress' : 'Needs Focus';

                await db.run(`
                    INSERT INTO courses_exammark (
                        exam_id, student_id, marks_obtained, total_marks, remarks, evaluated_at, evaluated_by_id
                    ) VALUES (?, ?, ?, 100.0, ?, ?, ?)
                `, [midTermId, sId, marksObtained, remark, dateNow, course.instructor_id]);
            }
        }

        console.log('✓ Successfully seeded exams, questions, and 75 student marks across all courses!');
        process.exit(0);

    } catch (err) {
        console.error('✗ Failed to seed exam data:', err);
        process.exit(1);
    }
}

initAndSeedExams();
