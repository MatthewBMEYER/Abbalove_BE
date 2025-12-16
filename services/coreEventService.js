const DB = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const { success, error } = require("../utils/response");
const { formatDateForMySQL } = require("../utils/dateUtils");

module.exports = {
    createEvent: async function (data) {
        const connection = await DB.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Create the main event
            const eventId = uuidv4();
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
            const startTime = formatDateForMySQL(data.start_time);
            const endTime = formatDateForMySQL(data.end_time);

            const eventSql = `
        INSERT INTO events (
          id, name, type, start_time, end_time, location,
          is_public, description, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

            const eventValues = [
                eventId,
                data.name,
                data.type || 'other',
                startTime,
                endTime || null,
                data.location || null,
                data.is_public !== undefined ? (data.is_public ? 1 : 0) : 1,
                data.description || null,
                data.status || 'draft',
                data['created-by'] || null,
                now,
                now
            ];

            await connection.execute(eventSql, eventValues);

            // 2. Insert speakers if provided
            if (data.speakers && Array.isArray(data.speakers)) {
                for (const speaker of data.speakers) {
                    const speakerId = speaker.id || uuidv4();

                    // Validate and normalize the type
                    let speakerType = null;
                    if (speaker.type) {
                        const normalizedType = speaker.type.toLowerCase().trim();
                        if (normalizedType === 'user' || normalizedType === 'guest') {
                            speakerType = normalizedType;
                        } else {
                            console.warn(`Invalid speaker type: "${speaker.type}". Setting to null.`);
                        }
                    }

                    const speakerSql = `
            INSERT INTO event_speaker (
                id, event_id, type, speaker_id, speaker_name,
                translator_id, translator_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

                    // Handle guest vs user differently
                    let speakerUserId = null;
                    let speakerName = null;

                    if (speakerType === 'user') {
                        // For user type: store user_id and name
                        speakerUserId = speaker.userId || null;
                        speakerName = speaker.name || null;
                    } else if (speakerType === 'guest') {
                        // For guest type: only store name, user_id is null
                        speakerUserId = null;
                        speakerName = speaker.name || null;
                    } else {
                        // Fallback for null type
                        speakerUserId = null;
                        speakerName = speaker.name || null;
                    }

                    const speakerValues = [
                        speakerId,
                        eventId,
                        speakerType,
                        speakerUserId,        // speaker_id (user_id if type='user', null if type='guest')
                        speakerName,          // speaker_name
                        null,                 // translator_id
                        null                  // translator_name
                    ];

                    await connection.execute(speakerSql, speakerValues);
                }
            }

            // 3. Insert translators if provided
            if (data.translators && Array.isArray(data.translators)) {
                for (const translator of data.translators) {
                    // Validate translator type
                    let translatorType = null;
                    if (translator.type) {
                        const normalizedType = translator.type.toLowerCase().trim();
                        if (normalizedType === 'user' || normalizedType === 'guest') {
                            translatorType = normalizedType;
                        } else {
                            console.warn(`Invalid translator type: "${translator.type}". Setting to null.`);
                        }
                    }

                    // Check if translator is also a speaker (only for user type)
                    const isTranslatorAlsoSpeaker = data.speakers?.some(speaker => {
                        // Only match if both are user type
                        if (speaker.type?.toLowerCase() !== 'user' || translatorType !== 'user') {
                            return false;
                        }
                        // Match by userId
                        return speaker.userId === translator.userId;
                    });

                    if (isTranslatorAlsoSpeaker && translatorType === 'user') {
                        // Update existing speaker record to add translator info
                        const updateSpeakerSql = `
                UPDATE event_speaker 
                SET translator_id = ?, 
                    translator_name = ? 
                WHERE event_id = ? 
                AND speaker_id = ? 
                AND type = 'user'
            `;

                        await connection.execute(updateSpeakerSql, [
                            translator.userId || null,
                            translator.name,
                            eventId,
                            translator.userId
                        ]);
                    } else {
                        // Create separate translator record
                        const translatorId = translator.id || uuidv4();
                        const translatorSql = `
                INSERT INTO event_speaker (
                    id, event_id, type, speaker_id, speaker_name,
                    translator_id, translator_name
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

                        // Handle guest vs user differently
                        let translatorUserId = null;
                        let translatorName = null;

                        if (translatorType === 'user') {
                            // For user type: store translator_id and translator_name
                            translatorUserId = translator.userId || null;
                            translatorName = translator.name || null;
                        } else if (translatorType === 'guest') {
                            // For guest type: only store translator_name, translator_id is null
                            translatorUserId = null;
                            translatorName = translator.name || null;
                        } else {
                            // Fallback for null type
                            translatorUserId = null;
                            translatorName = translator.name || null;
                        }

                        const translatorValues = [
                            translatorId,
                            eventId,
                            translatorType,
                            null,                 // speaker_id (not applicable for translator-only)
                            null,                 // speaker_name
                            translatorUserId,     // translator_id (user_id if type='user', null if type='guest')
                            translatorName        // translator_name
                        ];

                        await connection.execute(translatorSql, translatorValues);
                    }
                }
            }

            // 4. Insert songs if provided
            if (data.songs && Array.isArray(data.songs)) {
                for (const song of data.songs) {
                    const songId = song.id || uuidv4();
                    const songSql = `
            INSERT INTO event_songs (
              id, event_id, title, song_order, song_key, bpm
            ) VALUES (?, ?, ?, ?, ?, ?)
          `;

                    const songValues = [
                        songId,
                        eventId,
                        song.title,
                        song.order || 1,
                        song.key || null,
                        song.bpm || null
                    ];

                    await connection.execute(songSql, songValues);
                }
            }

            // 5. Insert presentations if provided
            if (data.presentations && Array.isArray(data.presentations)) {
                for (const presentation of data.presentations) {
                    const presentationId = presentation.id || uuidv4();
                    const presentationSql = `
            INSERT INTO event_presentations (
              id, event_id, file_name, file_size, file_type, file_url, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `;

                    const presentationValues = [
                        presentationId,
                        eventId,
                        presentation.name,
                        presentation.size || null,
                        presentation.type || null,
                        presentation.url,
                        presentation.uploadedAt || now
                    ];

                    await connection.execute(presentationSql, presentationValues);
                }
            }

            // 6. Handle team assignments - Map team keys to actual team IDs
            if (data.team_assignments && typeof data.team_assignments === 'object') {
                // Map of common team keys to actual team names/IDs
                const teamKeyMapping = {
                    'team-singer': 'Singer Team',
                    'team-music': 'Music Team',
                    'team-usher': 'Usher Team',
                    'team-media': 'Media Team'
                };

                for (const [teamKey, members] of Object.entries(data.team_assignments)) {
                    if (Array.isArray(members)) {
                        // Get or find the actual team ID based on the teamKey
                        const teamName = teamKeyMapping[teamKey] || teamKey;

                        // Query to find team by name (case-insensitive)
                        const [teamRows] = await connection.execute(
                            'SELECT id FROM teams WHERE LOWER(name) LIKE LOWER(?) AND is_active = 1',
                            [`%${teamName}%`]
                        );

                        let teamId = null;

                        if (teamRows.length > 0) {
                            // Use existing team
                            teamId = teamRows[0].id;
                        } else {
                            // Create a new team entry (optional - you might want to skip if team doesn't exist)
                            // For now, we'll skip teams that don't exist in the database
                            console.warn(`Team "${teamName}" not found in database. Skipping team assignments.`);
                            continue;
                        }

                        // Create event_team entry (linking team to event)
                        const eventTeamId = uuidv4();
                        const eventTeamSql = `
              INSERT INTO event_teams (id, team_id, event_id) 
              VALUES (?, ?, ?)
            `;
                        await connection.execute(eventTeamSql, [
                            eventTeamId,
                            teamId,
                            eventId
                        ]);

                        // Insert team members
                        for (const member of members) {
                            const memberId = uuidv4();
                            const memberSql = `
                INSERT INTO event_team_member (
                  id, event_team_id, user_id, role_name, details
                ) VALUES (?, ?, ?, ?, ?)
              `;

                            await connection.execute(memberSql, [
                                memberId,
                                eventTeamId,
                                member.user_id || null,
                                member.role_in_event || null,
                                member.details || null
                            ]);
                        }
                    }
                }
            }

            await connection.commit();

            return success("EVENT_CREATED", "Event created successfully", { eventId });

        } catch (error) {
            await connection.rollback();
            console.error('Error creating event:', error);

            return error("CREATE_FAILED", "Failed to create event", error);

        } finally {
            connection.release();
        }
    },

    getAllEventPublic: async function (filters = {}) {
        const connection = await DB.getConnection();

        try {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Build WHERE clause - only published, public events from today forward
            let whereClause = 'start_time >= ? AND status = "published" AND is_public = 1';
            const params = [now];

            // Apply type filter if provided
            if (filters.type && filters.type !== 'all') {
                const types = filters.type.split(',');
                whereClause += ` AND type IN (${types.map(() => '?').join(',')})`;
                params.push(...types);
            }

            // Get events
            const [events] = await connection.execute(
                `SELECT * FROM events 
             WHERE ${whereClause}
             ORDER BY start_time ASC`,
                params
            );

            return success("EVENTS_FETCHED", "Upcoming published events retrieved successfully", {
                events: events,
                count: events.length
            });

        } catch (err) {
            console.error('Error getting all public events:', err);
            return error("FETCH_FAILED", "Failed to retrieve events", err.message);
        } finally {
            connection.release();
        }
    },

    getAllEventAdmin: async function (filters = {}) {
        const connection = await DB.getConnection();

        try {
            const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

            // Build WHERE clause for admin
            let whereClause = 'start_time >= ? AND is_public = 1';
            const params = [now];

            // Filter by status if provided
            if (filters.status && filters.status !== 'all') {
                const statuses = filters.status.split(',');
                whereClause += ` AND status IN (${statuses.map(() => '?').join(',')})`;
                params.push(...statuses);
            }

            // Filter by type if provided
            if (filters.type && filters.type !== 'all') {
                const types = filters.type.split(',');
                whereClause += ` AND type IN (${types.map(() => '?').join(',')})`;
                params.push(...types);
            }

            // Get events
            const [events] = await connection.execute(
                `SELECT * FROM events 
             WHERE ${whereClause}
             ORDER BY start_time ASC`,
                params
            );

            return success("EVENTS_FETCHED", "Upcoming events retrieved successfully", {
                events: events,
                count: events.length
            });

        } catch (err) {
            console.error('Error getting all admin events:', err);
            return error("FETCH_FAILED", "Failed to retrieve events", err.message);
        } finally {
            connection.release();
        }
    },

    getAllPostEventPublic: async function (filters = {}) {
        const connection = await DB.getConnection();

        try {
            // Build WHERE clause - only published, public events that have ended (past events)
            let whereClause = 'end_time < NOW() AND status = "published" AND is_public = 1';
            const params = [];

            // Apply year filter if provided
            if (filters.year) {
                const year = parseInt(filters.year);
                const startDate = `${year}-01-01 00:00:00`;
                const endDate = `${year}-12-31 23:59:59`;
                whereClause += ' AND start_time >= ? AND start_time <= ?';
                params.push(startDate, endDate);
            } else {
                // If no year filter, get all past events (not limited to current year)
                whereClause += ' AND start_time <= NOW()';
            }

            // Apply month filter if provided (1-12)
            if (filters.month) {
                const month = parseInt(filters.month);
                whereClause += ' AND MONTH(start_time) = ?';
                params.push(month);
            }

            // Apply type filter if provided
            if (filters.type && filters.type !== 'all') {
                const types = filters.type.split(',');
                whereClause += ` AND type IN (${types.map(() => '?').join(',')})`;
                params.push(...types);
            }

            // Get events
            const [events] = await connection.execute(
                `SELECT * FROM events 
         WHERE ${whereClause}
         ORDER BY start_time DESC`,
                params
            );

            return success("POST_EVENTS_FETCHED", "Post events retrieved successfully", {
                events: events,
                count: events.length,
                filters: filters
            });

        } catch (err) {
            console.error('Error getting post public events:', err);
            return error("FETCH_FAILED", "Failed to retrieve post events", err.message);
        } finally {
            connection.release();
        }
    },

    getAllPostEventAdmin: async function (filters = {}) {
        const connection = await DB.getConnection();

        try {
            // Build WHERE clause for admin - all past events that are public
            let whereClause = 'end_time < NOW() AND is_public = 1';
            const params = [];

            // Apply year filter if provided
            if (filters.year) {
                const year = parseInt(filters.year);
                const startDate = `${year}-01-01 00:00:00`;
                const endDate = `${year}-12-31 23:59:59`;
                whereClause += ' AND start_time >= ? AND start_time <= ?';
                params.push(startDate, endDate);
            } else {
                // If no year filter, get all past events
                whereClause += ' AND start_time <= NOW()';
            }

            // Apply month filter if provided (1-12)
            if (filters.month) {
                const month = parseInt(filters.month);
                whereClause += ' AND MONTH(start_time) = ?';
                params.push(month);
            }

            // Filter by status if provided
            if (filters.status && filters.status !== 'all') {
                const statuses = filters.status.split(',');
                whereClause += ` AND status IN (${statuses.map(() => '?').join(',')})`;
                params.push(...statuses);
            }

            // Filter by type if provided
            if (filters.type && filters.type !== 'all') {
                const types = filters.type.split(',');
                whereClause += ` AND type IN (${types.map(() => '?').join(',')})`;
                params.push(...types);
            }

            // Get events
            const [events] = await connection.execute(
                `SELECT * FROM events 
         WHERE ${whereClause}
         ORDER BY start_time DESC`,
                params
            );

            return success("POST_EVENTS_FETCHED", "Post events retrieved successfully", {
                events: events,
                count: events.length,
                filters: filters
            });

        } catch (err) {
            console.error('Error getting post admin events:', err);
            return error("FETCH_FAILED", "Failed to retrieve post events", err.message);
        } finally {
            connection.release();
        }
    },

    getEventById: async function (id) {
        const connection = await DB.getConnection();

        try {
            // 1. Get the main event details
            const [eventRows] = await connection.execute(
                `SELECT * FROM events WHERE id = ?`,
                [id]
            );

            if (eventRows.length === 0) {
                return error("EVENT_NOT_FOUND", "Event not found");
            }

            const event = eventRows[0];

            // Get SPEAKERS (including those with translators)
            const [speakerRows] = await connection.execute(
                `SELECT 
                es.id,
                es.type,
                es.speaker_id as userId,
                es.speaker_name as name,
                es.translator_id as translatorUserId,
                es.translator_name as translatorName,
                es.addedAt,
                u.email as userEmail
             FROM event_speaker es
             LEFT JOIN user u ON es.speaker_id = u.id
             WHERE es.event_id = ? 
             AND (es.speaker_id IS NOT NULL OR es.speaker_name IS NOT NULL)`,
                [id]
            );

            // Get TRANSLATOR-ONLY (not speakers)
            const [translatorRows] = await connection.execute(
                `SELECT 
                es.id,
                es.type,
                es.translator_id as userId,
                es.translator_name as name,
                es.addedAt,
                u.email as userEmail
             FROM event_speaker es
             LEFT JOIN user u ON es.translator_id = u.id
             WHERE es.event_id = ? 
             AND es.speaker_id IS NULL 
             AND es.speaker_name IS NULL
             AND (es.translator_id IS NOT NULL OR es.translator_name IS NOT NULL)`,
                [id]
            );

            // 3. Get songs
            const [songRows] = await connection.execute(
                `SELECT 
                id,
                title,
                song_order as \`order\`,
                song_key as \`key\`,
                bpm
             FROM event_songs 
             WHERE event_id = ? 
             ORDER BY song_order`,
                [id]
            );

            // 4. Get presentations
            const [presentationRows] = await connection.execute(
                `SELECT 
                id,
                file_name as name,
                file_size as size,
                file_type as type,
                file_url as url,
                uploaded_at as uploadedAt
             FROM event_presentations 
             WHERE event_id = ? 
             ORDER BY uploaded_at`,
                [id]
            );

            // 5. Get team assignments (NO tech_roles field)
            const [teamAssignmentRows] = await connection.execute(
                `SELECT 
                et.id as event_team_id,
                t.id as team_id,
                t.name as team_name,
                etm.user_id,
                CONCAT(u.first_name, ' ', u.last_name) as user_name,
                etm.role_name as role_in_event,
                etm.details
            FROM event_teams et
            JOIN teams t ON et.team_id = t.id
            LEFT JOIN event_team_member etm ON et.id = etm.event_team_id
            LEFT JOIN user u ON etm.user_id = u.id
            WHERE et.event_id = ?
            ORDER BY t.name, etm.role_name`,
                [id]
            );

            // Organize team assignments by team
            const teamAssignments = {};

            teamAssignmentRows.forEach(row => {
                if (!row.user_id) return;

                const teamKey = `team-${row.team_name.toLowerCase().replace(' team', '').replace(/\s+/g, '-')}`;

                if (!teamAssignments[teamKey]) {
                    teamAssignments[teamKey] = [];
                }

                // Build member object WITHOUT tech_roles
                const member = {
                    user_id: row.user_id,
                    name: row.user_name,
                    role_in_event: row.role_in_event,
                    details: row.details
                };

                // Only add position_id if it exists in your table
                if (row.position_id !== undefined && row.position_id !== null) {
                    member.position_id = row.position_id;
                }

                teamAssignments[teamKey].push(member);
            });

            // 6. Ensure ALL required teams exist (even if empty)
            const requiredTeams = ['team-singer', 'team-music', 'team-usher', 'team-media'];
            requiredTeams.forEach(teamKey => {
                if (!teamAssignments[teamKey]) {
                    teamAssignments[teamKey] = [];
                }
            });

            // 7. Format the response
            const result = {
                id: event.id,
                name: event.name,
                type: event.type,
                start_time: event.start_time.toISOString(),
                end_time: event.end_time ? event.end_time.toISOString() : null,
                location: event.location,
                description: event.description,
                is_public: event.is_public === 1,
                status: event.status,
                "created-by": event.created_by,
                created_at: event.created_at ? event.created_at.toISOString() : null,
                updated_at: event.updated_at ? event.updated_at.toISOString() : null,

                // Speakers - Format directly from query
                speakers: speakerRows.map(row => ({
                    id: row.id,
                    type: row.type,  // "user" or "guest"
                    name: row.name,
                    userId: row.type === 'user' ? row.userId : null,  // null if guest
                    email: row.type === 'user' ? row.userEmail : null,  // only for user type
                    translator_id: row.translatorUserId,
                    translator_name: row.translatorName,
                    addedAt: row.addedAt ? row.addedAt.toISOString() : null
                })),

                // Translators - Format directly from query
                translators: translatorRows.map(row => ({
                    id: row.id,
                    type: row.type,  // "user" or "guest"
                    name: row.name,
                    userId: row.type === 'user' ? row.userId : null,  // null if guest
                    email: row.type === 'user' ? row.userEmail : null,  // only for user type
                    addedAt: row.addedAt ? row.addedAt.toISOString() : null
                })),

                // Presentations
                presentations: presentationRows.map(presentation => ({
                    id: presentation.id,
                    name: presentation.name,
                    size: presentation.size,
                    type: presentation.type,
                    url: presentation.url,
                    uploadedAt: presentation.uploadedAt ? presentation.uploadedAt.toISOString() : null
                })),

                // Songs
                songs: songRows.map(song => ({
                    id: song.id,
                    title: song.title,
                    order: song.order,
                    key: song.key || null,
                    bpm: song.bpm || null
                })),

                // Team assignments
                team_assignments: teamAssignments
            };

            return success("EVENT_FETCHED", "Event fetched successfully", result);

        } catch (error) {
            console.error('Error getting event by ID:', error);
            return error("FETCH_FAILED", "Failed to fetch event", error);
        } finally {
            connection.release();
        }
    },

    updateEvent: async function (id, data) {
    },

    deleteEvent: async function () {
    },
}