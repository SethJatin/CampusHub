const db = require('./config/db');

async function seedEventsAndAnnouncements() {
    console.log('--- SEEDING UPCOMING & COMPLETED EVENTS & ANNOUNCEMENTS ---');

    try {
        const dateNow = new Date().toISOString();

        // Get admin or faculty user ID for organized_by / created_by
        let adminUser = await db.get("SELECT id FROM accounts_user WHERE role IN ('faculty', 'admin') LIMIT 1");
        const authorId = adminUser ? adminUser.id : 1;

        // Clear existing events & announcements for clean setup
        await db.run('DELETE FROM events_event');
        await db.run('DELETE FROM events_announcement');

        // Insert Events
        const events = [
            {
                title: '🇮🇳 Grand 80th Independence Day Celebration 2026',
                description: 'Join us on August 15, 2026, for the Flag Hoisting Ceremony, March Past by NCC cadets, patriotic cultural performances, distribution of sweets, and address by the Principal & Guest of Honor.',
                category: 'cultural',
                start_date: '2026-08-15T08:30:00.000Z',
                end_date: '2026-08-15T13:00:00.000Z',
                venue: 'Main Campus Flag Lawn & Auditorium',
                department: 'General',
                registration_required: 1,
                registration_deadline: '2026-08-14T18:00:00.000Z',
                max_participants: 500,
                status: 'published',
                banner: 'event_banners/independence_day_2026.png',
                organized_by_id: authorId
            },
            {
                title: '🚀 HACK-CAMPUS 2026: 48-Hour AI & Tech Hackathon',
                description: 'An exclusive 48-hour national hackathon for student developers and innovators. Build groundbreaking AI applications, compete for cash prizes worth ₹1.5 Lakhs, and win mentorship opportunities from top tech leaders.',
                category: 'academic',
                start_date: '2026-08-22T09:00:00.000Z',
                end_date: '2026-08-24T18:00:00.000Z',
                venue: 'Central Computer Complex & Incubation Lab',
                department: 'Computer Science',
                registration_required: 1,
                registration_deadline: '2026-08-20T23:59:00.000Z',
                max_participants: 200,
                status: 'published',
                banner: 'event_banners/tech_hackathon_2026.png',
                organized_by_id: authorId
            },
            {
                title: '🎭 SPANDAN 2026: Annual Cultural Gala & Live Music Night',
                description: 'Experience an unforgettable evening of live music, dance battles, battle of the bands, drama performances, and a celebrity guest night at SPANDAN 2026.',
                category: 'cultural',
                start_date: '2026-09-05T17:00:00.000Z',
                end_date: '2026-09-05T22:30:00.000Z',
                venue: 'Open Air Amphitheatre',
                department: 'Cultural Society',
                registration_required: 1,
                registration_deadline: '2026-09-04T18:00:00.000Z',
                max_participants: 1000,
                status: 'published',
                banner: 'event_banners/cultural_fest_2026.png',
                organized_by_id: authorId
            }
        ];

        for (const e of events) {
            await db.run(`
                INSERT INTO events_event (
                    title, description, category, start_date, end_date, venue, department,
                    registration_required, registration_deadline, max_participants, status,
                    banner, attachment, created_at, updated_at, organized_by_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?)
            `, [
                e.title, e.description, e.category, e.start_date, e.end_date, e.venue, e.department,
                e.registration_required, e.registration_deadline, e.max_participants, e.status,
                e.banner, dateNow, dateNow, e.organized_by_id
            ]);
        }
        console.log(`✓ Inserted ${events.length} exclusive events`);

        // Insert Announcements (Active & Past Expired)
        const announcements = [
            {
                title: '🇮🇳 Official Invitation: Independence Day Celebrations 2026',
                content: 'All students, faculty, and staff members are cordially invited to celebrate the 80th Independence Day on August 15th at 8:30 AM in the Flag Lawn. Dress code: Traditional / Patriotic White.',
                priority: 'urgent',
                target_roles: '["student","faculty","admin"]',
                is_published: 1,
                start_date: '2026-08-01T00:00:00.000Z',
                end_date: '2026-08-15T13:00:00.000Z',
                created_by_id: authorId
            },
            {
                title: '🚀 Registrations Open for HACK-CAMPUS 2026!',
                content: 'Registrations are now live for HACK-CAMPUS 2026 (48-hr AI Innovation Challenge). Forming teams of 2 to 4 students. Win ₹1,50,000 in total cash prizes.',
                priority: 'high',
                target_roles: '["student"]',
                is_published: 1,
                start_date: '2026-08-01T00:00:00.000Z',
                end_date: '2026-08-24T18:00:00.000Z',
                created_by_id: authorId
            },
            {
                title: '🎭 SPANDAN 2026 Auditions & Call for Performers',
                content: 'Auditions for solo singing, group dance, fashion show, and rock band performances for SPANDAN 2026 start next Monday. Reserve your audition slot on the events portal.',
                priority: 'normal',
                target_roles: '["student"]',
                is_published: 1,
                start_date: '2026-08-01T00:00:00.000Z',
                end_date: '2026-09-05T22:30:00.000Z',
                created_by_id: authorId
            },
            {
                // Completed past event announcement (should be auto-filtered/removed after event completion)
                title: '🎓 Past Event: Campus Orientation 2026 (Completed)',
                content: 'Welcome orientation for new batch 2026 held on July 20th. (This announcement was for a past event and is auto-filtered).',
                priority: 'normal',
                target_roles: '["student"]',
                is_published: 1,
                start_date: '2026-07-01T00:00:00.000Z',
                end_date: '2026-07-20T17:00:00.000Z', // Past date!
                created_by_id: authorId
            }
        ];

        for (const a of announcements) {
            await db.run(`
                INSERT INTO events_announcement (
                    title, content, priority, target_roles, is_published, start_date, end_date, created_at, updated_at, created_by_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [a.title, a.content, a.priority, a.target_roles, a.is_published, a.start_date, a.end_date, dateNow, dateNow, a.created_by_id]);
        }
        console.log(`✓ Inserted ${announcements.length} announcements (including 1 past expired announcement)`);

        console.log('SUCCESS: Events and Announcements seeded cleanly!');
        process.exit(0);

    } catch (err) {
        console.error('✗ Seeding Failed:', err);
        process.exit(1);
    }
}

seedEventsAndAnnouncements();
