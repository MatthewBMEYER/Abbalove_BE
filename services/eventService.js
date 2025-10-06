const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const DB = require("../config/db");
const { success, error } = require("../utils/response");

const getAllEvent = async () => {
    const [events] = await DB.query("SELECT * FROM events");
    if (events.length === 0) {
        return success("NOT_FOUND", "No events found");
    }
    return success("EVENTS_FETCHED", "All events successfully fetched", events);
};

const getAllEventByGroupId = async (groupId) => {
    // Check if group exists
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }
    // Get all events for that group

    const [events] = await DB.query("SELECT * FROM events WHERE group_id = ?", [groupId]);
    if (events.length === 0) {
        return success("NOT_FOUND", "No events found");
    }
    return success("EVENTS_FETCHED", "All events successfully fetched", events);
}

const createEvent = async (name, type, groupId, startTime, endTime, location) => {
    const [group] = await DB.query(
        "SELECT * FROM comcell_group WHERE id = ?",
        [groupId]
    );
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }

    const [existing] = await DB.query(
        "SELECT * FROM events WHERE group_id = ? AND start_time = ? AND end_time = ?",
        [groupId, startTime, endTime]
    );
    if (existing.length > 0) {
        return error(
            "FAILED_TO_CREATE_EVENT",
            "Event already exists in this group at this time"
        );
    }

    const eventId = uuidv4();
    await DB.query(
        `INSERT INTO events (id, name, type, group_id, start_time, end_time, location, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [eventId, name, type, groupId, startTime, endTime, location]
    );

    const [members] = await DB.query(
        "SELECT user_id FROM comcell_group_members WHERE group_id = ?",
        [groupId]
    );

    if (members.length > 0) {
        // prepare attendance rows
        const attendanceRows = members.map((m) => [
            uuidv4(),
            eventId,
            m.user_id,
            "absent", // default
        ]);

        // bulk insert attendance
        await DB.query(
            "INSERT INTO event_attendance (id, event_id, user_id, status) VALUES ?",
            [attendanceRows]
        );
    }

    return success("EVENT_CREATED", "Event created successfully");
};

const deleteEvent = async (eventId) => {
    // Check if event exists
    const [event] = await DB.query("SELECT * FROM events WHERE id = ?", [eventId]);
    if (event.length === 0) {
        return error("EVENT_NOT_FOUND", "No event with that id found");
    }

    await DB.query("DELETE FROM events WHERE id = ?", [eventId]);

    return success("EVENT_DELETED", "Event deleted successfully");
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
    // 1. total events for this group
    const [[{ total_events }]] = await DB.query(
        "SELECT COUNT(*) AS total_events FROM events WHERE group_id = ?",
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
     WHERE e.group_id = ? 
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
     WHERE e.group_id = ? AND ea.user_id IN (?)
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
       WHERE e.group_id = ? AND ea.user_id = ?
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
    getAllEvent,
    getAllEventByGroupId,
    createEvent,
    deleteEvent,

    getAttendance,
    updateAttendance,
    getAttendanceStats,
};




