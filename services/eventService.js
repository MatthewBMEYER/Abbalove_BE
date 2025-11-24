const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const DB = require("../config/db");
const { success, error } = require("../utils/response");
const { formatDateForMySQL } = require("../utils/dateUtils");

// Base event creation - can be used for both public and private events
const createBaseEvent = async (eventData) => {
    const {
        name,
        type,
        startTime,
        endTime,
        location,
        isPublic = 1, // Default to public
        description = null,
        createdBy = null
    } = eventData;

    // Convert ISO datetime to MySQL DATETIME format using utility
    const mysqlStartTime = formatDateForMySQL(startTime);
    const mysqlEndTime = formatDateForMySQL(endTime);

    const eventId = uuidv4();

    await DB.query(
        `INSERT INTO events (id, name, type, start_time, end_time, location, is_public, description, created_by, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [eventId, name, type, mysqlStartTime, mysqlEndTime, location, isPublic, description, createdBy]
    );

    return eventId;
};

// Create public event (uses base event creation)
const createPublicEvent = async (name, type, startTime, endTime, location, description = null, createdBy = null) => {
    const eventId = await createBaseEvent({
        name,
        type,
        startTime,
        endTime,
        location,
        isPublic: 1,
        description,
        createdBy
    });

    return success("EVENT_CREATED", "Public event created successfully", { eventId });
};

// Create comcell event (private event associated with groups)
const createComcellEvent = async (name, type, groupIds, startTime, endTime, location, description = null, createdBy = null) => {
    // Ensure groupIds is an array
    const groupIdArray = Array.isArray(groupIds) ? groupIds : [groupIds];

    // Validate all groups exist
    const placeholders = groupIdArray.map(() => '?').join(',');
    const [groups] = await DB.query(
        `SELECT id FROM comcell_group WHERE id IN (${placeholders})`,
        groupIdArray
    );

    if (groups.length !== groupIdArray.length) {
        return error("GROUP_NOT_FOUND", "One or more groups not found");
    }

    // Check for scheduling conflicts for each group
    const mysqlStartTime = formatDateForMySQL(startTime);
    const mysqlEndTime = formatDateForMySQL(endTime);

    for (const groupId of groupIdArray) {
        const [existing] = await DB.query(
            `SELECT ce.id 
             FROM comcell_events ce 
             JOIN events e ON ce.event_id = e.id 
             WHERE ce.group_id = ? AND e.start_time = ? AND e.end_time = ?`,
            [groupId, mysqlStartTime, mysqlEndTime]
        );

        if (existing.length > 0) {
            return error(
                "FAILED_TO_CREATE_EVENT",
                `Event already exists in group ${groupId} at this time`
            );
        }
    }

    // Create the base private event
    const eventId = await createBaseEvent({
        name,
        type,
        startTime,
        endTime,
        location,
        isPublic: 0, // Private event
        description,
        createdBy
    });

    // Create comcell_event associations
    const comcellEventRows = groupIdArray.map(groupId => [
        uuidv4(),
        eventId,
        groupId
    ]);

    await DB.query(
        "INSERT INTO comcell_events (id, event_id, group_id) VALUES ?",
        [comcellEventRows]
    );

    // Create attendance records for all members of all groups
    const allMembers = [];
    for (const groupId of groupIdArray) {
        const [members] = await DB.query(
            "SELECT user_id FROM comcell_group_members WHERE group_id = ?",
            [groupId]
        );
        allMembers.push(...members.map(m => m.user_id));
    }

    // Remove duplicate user IDs (users might be in multiple groups)
    const uniqueUserIds = [...new Set(allMembers)];

    if (uniqueUserIds.length > 0) {
        const attendanceRows = uniqueUserIds.map(userId => [
            uuidv4(),
            eventId,
            userId,
            "absent", // default status
        ]);

        await DB.query(
            "INSERT INTO event_attendance (id, event_id, user_id, status) VALUES ?",
            [attendanceRows]
        );
    }

    return success("EVENT_CREATED", "Comcell event created successfully", { eventId, groupIds: groupIdArray });
};

// Generic event creation function that can handle different contexts
const createEvent = async (eventData, context = {}) => {
    const {
        name,
        type,
        startTime,
        endTime,
        location,
        description = null,
        createdBy = null
    } = eventData;

    const { isPublic = true, groupIds = null } = context;

    if (isPublic) {
        return await createPublicEvent(name, type, startTime, endTime, location, description, createdBy);
    } else {
        if (!groupIds || (Array.isArray(groupIds) && groupIds.length === 0)) {
            return error("INVALID_INPUT", "Group IDs are required for private events");
        }
        return await createComcellEvent(name, type, groupIds, startTime, endTime, location, description, createdBy);
    }
};

const getAllEvent = async (month, year) => {

    const [events] = await DB.query("SELECT * FROM events WHERE MONTH(start_time) = ? AND YEAR(start_time) = ? AND is_public = 1", [month, year]);
    if (events.length === 0)
        if (events.length === 0) {
            return success("NOT_FOUND", "No public events found", events);
        }
    return success("EVENTS_FETCHED", "All public events successfully fetched", events);
};

const getAllEventByGroupId = async (groupId) => {
    // Check if group exists
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }

    // Get all events for that group (both public and private events associated with the group)
    const [events] = await DB.query(
        `SELECT e.* 
         FROM events e
         LEFT JOIN comcell_events ce ON e.id = ce.event_id
         WHERE e.is_public = 1 OR ce.group_id = ?`,
        [groupId]
    );

    if (events.length === 0) {
        return success("NOT_FOUND", "No events found for this group");
    }
    return success("EVENTS_FETCHED", "All events successfully fetched", events);
};

const getComcellEventsByGroupId = async (groupId) => {
    // Check if group exists
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }

    // Get only comcell events for that group
    const [events] = await DB.query(
        `SELECT e.* 
         FROM events e
         JOIN comcell_events ce ON e.id = ce.event_id
         WHERE ce.group_id = ? AND e.is_public = 0`,
        [groupId]
    );

    if (events.length === 0) {
        return success("NOT_FOUND", "No comcell events found for this group");
    }
    return success("EVENTS_FETCHED", "Comcell events successfully fetched", events);
};

const updateEvent = async (eventId, eventData) => {
    const {
        name,
        type,
        startTime,
        endTime,
        location,
        description,
        isPublic
    } = eventData;

    const mysqlStartTime = formatDateForMySQL(startTime);
    const mysqlEndTime = formatDateForMySQL(endTime);

    await DB.query(
        `UPDATE events 
         SET name = ?, type = ?, start_time = ?, end_time = ?, location = ?, description = ?, is_public = ?, updated_at = NOW()
         WHERE id = ?`,
        [name, type, mysqlStartTime, mysqlEndTime, location, description, isPublic, eventId]
    );

    return success("EVENT_UPDATED", "Event updated successfully");
};

const deleteEvent = async (eventId) => {
    // Check if event exists
    const [event] = await DB.query("SELECT * FROM events WHERE id = ?", [eventId]);
    if (event.length === 0) {
        return error("EVENT_NOT_FOUND", "No event with that id found");
    }

    // Use transaction to ensure data consistency
    const connection = await DB.getConnection();
    try {
        await connection.beginTransaction();

        // Delete from comcell_events first (child table)
        await connection.query("DELETE FROM comcell_events WHERE event_id = ?", [eventId]);

        // Delete from event_attendance
        await connection.query("DELETE FROM event_attendance WHERE event_id = ?", [eventId]);

        // Finally delete the event
        await connection.query("DELETE FROM events WHERE id = ?", [eventId]);

        await connection.commit();

        return success("EVENT_DELETED", "Event deleted successfully");
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
};

const getAttendance = async (eventIds) => {
    if (!eventIds || eventIds.length === 0) {
        return error("NO_EVENT_IDS", "No event IDs provided");
    }

    // ensure array
    const ids = Array.isArray(eventIds) ? eventIds : [eventIds];

    const [rows] = await DB.query(
        `SELECT ea.id AS attendance_id, 
            ea.event_id, 
            ea.user_id, 
            ea.status,
            ea.notes,
            CONCAT(u.first_name, ' ', u.last_name) AS user_name,
            u.email AS user_email
     FROM event_attendance ea
     JOIN user u ON ea.user_id = u.id
     WHERE ea.event_id IN (?)`,
        [ids]
    );

    // group by event_id
    const grouped = ids.reduce((acc, id) => {
        acc[id] = rows.filter((r) => r.event_id === id);
        return acc;
    }, {});

    return success("ATTENDANCE_FETCHED", "Attendance fetched successfully", grouped);
};

const updateAttendance = async (updates) => {
    if (!updates || updates.length === 0) {
        return error("NO_UPDATES", "No attendance updates provided");
    }

    // Collect attendance IDs
    const ids = updates.map((u) => u.attendance_id);

    // Build dynamic CASE WHEN for status + notes
    const sql = `
    UPDATE event_attendance
    SET 
      status = CASE id
        ${updates.map(() => `WHEN ? THEN ?`).join(" ")}
      END,
      notes = CASE id
        ${updates.map(() => `WHEN ? THEN ?`).join(" ")}
      END,
      updated_at = NOW()
    WHERE id IN (?)
  `;

    // Build params
    const params = [];
    // first push status mappings
    updates.forEach((u) => {
        params.push(u.attendance_id, u.status);
    });
    // then push notes mappings
    updates.forEach((u) => {
        params.push(u.attendance_id, u.notes || null);
    });
    // finally push ids for IN (?)
    params.push(ids);

    await DB.query(sql, params);

    return success("ATTENDANCE_UPDATED", "Attendance updated successfully");
};

const getAttendanceStats = async (groupId) => {
    // 1. total events for this group (both public and private events associated with the group)
    const [[{ total_events }]] = await DB.query(
        `SELECT COUNT(DISTINCT e.id) AS total_events 
         FROM events e
         LEFT JOIN comcell_events ce ON e.id = ce.event_id
         WHERE e.is_public = 1 OR ce.group_id = ?`,
        [groupId]
    );

    // 2. get all members of this group
    const [members] = await DB.query(
        "SELECT user_id FROM comcell_group_members WHERE group_id = ?",
        [groupId]
    );
    const userIds = members.map(m => m.user_id);

    if (userIds.length === 0) {
        return success("NO_MEMBERS", "Group has no members", []);
    }

    // 3. attended counts
    const [attendedRows] = await DB.query(
        `SELECT ea.user_id, COUNT(*) AS attended
     FROM event_attendance ea
     JOIN events e ON ea.event_id = e.id
     LEFT JOIN comcell_events ce ON e.id = ce.event_id
     WHERE (e.is_public = 1 OR ce.group_id = ?)
       AND ea.user_id IN (?) 
       AND ea.status = 'present'
     GROUP BY ea.user_id`,
        [groupId, userIds]
    );

    // 4. last status per user
    const [lastStatusRows] = await DB.query(
        `SELECT ea.user_id, ea.status, e.start_time
     FROM event_attendance ea
     JOIN events e ON ea.event_id = e.id
     LEFT JOIN comcell_events ce ON e.id = ce.event_id
     WHERE (e.is_public = 1 OR ce.group_id = ?) AND ea.user_id IN (?)
     ORDER BY e.start_time DESC`,
        [groupId, userIds]
    );

    const lastStatusMap = {};
    for (const row of lastStatusRows) {
        if (!lastStatusMap[row.user_id]) {
            lastStatusMap[row.user_id] = row.status; // first encountered = latest
        }
    }

    // 5. streaks per user
    const results = [];
    for (const userId of userIds) {
        const [history] = await DB.query(
            `SELECT ea.status
       FROM event_attendance ea
       JOIN events e ON ea.event_id = e.id
       LEFT JOIN comcell_events ce ON e.id = ce.event_id
       WHERE (e.is_public = 1 OR ce.group_id = ?) AND ea.user_id = ?
       ORDER BY e.start_time DESC`,
            [groupId, userId]
        );

        const [userRows] = await DB.query(`SELECT * FROM user WHERE id = ?`, [userId]);
        const user = userRows[0]; // first row
        const userName = user ? `${user.first_name} ${user.last_name[0]}` : null;

        let streak = 0;
        for (const record of history) {
            if (record.status === "present") streak++;
            else break;
        }

        const attended = attendedRows.find(r => r.user_id === userId)?.attended || 0;
        const percentage = total_events > 0 ? Math.round((attended / total_events) * 100) : 0;
        const last_event_status = lastStatusMap[userId] || null;

        results.push({
            userId,
            userName,
            total_events,
            attended,
            percentage,
            last_event_status,
            streak,
        });
    }

    return success("STATS_FETCHED", "Attendance stats fetched", results);
};

module.exports = {
    // Core event functions
    createBaseEvent,
    createPublicEvent,
    createComcellEvent,
    createEvent, // Generic creator

    // Query functions
    getAllEvent,
    getAllEventByGroupId,
    getComcellEventsByGroupId,

    // CRUD operations
    updateEvent,
    deleteEvent,

    // Attendance functions
    getAttendance,
    updateAttendance,
    getAttendanceStats,
};