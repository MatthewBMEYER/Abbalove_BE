const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const DB = require("../config/db");
const { success, error } = require("../utils/response");
const extractTeamType = require("../utils/extractTeamType");
const userService = require("../services/userService");
const crypto = require("crypto");


const getAllMainTeams = async () => {
    const [teams] = await DB.query("SELECT * FROM teams WHERE is_protected = 1");
    if (teams.length === 0) {
        return error("NOT_FOUND", "No main teams found");
    }
    return success("TEAMS_FETCHED", "All main teams successfully fetched", teams);
};

const getAllOtherTeams = async () => {
    const [teams] = await DB.query("SELECT * FROM teams WHERE is_protected = 0");
    if (teams.length === 0) {
        return error("NOT_FOUND", "No 'other' teams found");
    }
    return success("TEAMS_FETCHED", "All 'other' teams successfully fetched", teams);
};

const getTeamMembers = async (teamId) => {
    const [Teams] = await DB.query("SELECT * FROM teams WHERE id = ?", [teamId]);
    if (Teams.length === 0) {
        return error("TEAM_NOT_FOUND", "No team with that id found");
    }

    const [members] = await DB.query(`
        SELECT
        tm.*,
        CONCAT(u.first_name, ' ', u.last_name) AS name,
        GROUP_CONCAT(tp.label ORDER BY tp.label SEPARATOR ', ') AS positions,
        COUNT(tp.id) AS positions_count
        FROM team_members tm
        JOIN user u ON tm.user_id = u.id
        LEFT JOIN team_member_positions mp ON mp.team_id = tm.team_id AND mp.user_id = tm.user_id
        LEFT JOIN team_positions tp ON tp.id = mp.position_id
        WHERE tm.team_id = ?
        GROUP BY tm.team_id, tm.user_id;

    `, [teamId]);

    return success("MEMBER_FETCHED", "Successfully fetched members", members);
};

const getAllNonMembers = async (teamId) => {
    // Get all users
    const [users] = await DB.query("SELECT * FROM user");

    const membersRes = await getTeamMembers(teamId);
    const members = membersRes?.data || [];
    const memberIds = new Set(members.map(m => m.user_id));

    const nonMembers = users.filter(user => !memberIds.has(user.id));

    return success("NON_MEMBERS_FETCHED", "Successfully fetched non-members", nonMembers);
};


const getAllPositions = async (teamId) => {
    const [Teams] = await DB.query("SELECT * FROM teams WHERE id = ?", [teamId]);
    if (Teams.length === 0) {
        return error("TEAM_NOT_FOUND", "No team with that id found");
    }

    const teamType = extractTeamType(teamId);
    const [positions] = await DB.query("SELECT * FROM team_positions WHERE team_type = ?", [teamType]);

    return success("POSITIONS_FETCHED", "Position from team successfully fetched", positions);
};

const createPosition = async (teamId, label) => {
    // Check if team exists
    const [teams] = await DB.query("SELECT * FROM teams WHERE id = ?", [teamId]);
    if (teams.length === 0) {
        return error("TEAM_NOT_FOUND", "No team with that id found");
    }

    // Extract team type from teamId
    const teamType = extractTeamType(teamId);

    // Generate unique position id (slug style)
    const positionId = `pos-${label.toLowerCase().replace(/\s+/g, '')}`;

    // Check if already exists
    const [existing] = await DB.query("SELECT * FROM team_positions WHERE id = ?", [positionId]);
    if (existing.length > 0) {
        return error("POSITION_EXISTS", "Position with that label already exists");
    }

    // Insert new position
    await DB.query(
        "INSERT INTO team_positions (id, label, team_type) VALUES (?, ?, ?)",
        [positionId, label, teamType]
    );

    return success("POSITION_CREATED", "New position successfully created", { id: positionId, label, teamType });
};

const deletePosition = async (positionId) => {
    // Check if position exists
    const [positions] = await DB.query("SELECT * FROM team_positions WHERE id = ?", [positionId]);
    if (positions.length === 0) {
        return error("POSITION_NOT_FOUND", "No position with that id found");
    }

    // Check if position is still used in team_member_positions
    const [used] = await DB.query("SELECT * FROM team_member_positions WHERE position_id = ?", [positionId]);
    if (used.length > 0) {
        return error("POSITION_IN_USE", "Cannot delete position because it is still assigned to team members");
    }

    // Delete position
    await DB.query("DELETE FROM team_positions WHERE id = ?", [positionId]);

    return success("POSITION_DELETED", "Position successfully deleted", { id: positionId });
};

const getMemberDetail = async (teamId, userId) => {
    // Check if team exists
    const [teams] = await DB.query("SELECT * FROM teams WHERE id = ?", [teamId]);
    if (teams.length === 0) {
        return error("TEAM_NOT_FOUND", "No team with that id found");
    }

    // Get user detail
    const user = await userService.getUserDetailById(userId);
    if (!user) {
        return error("USER_NOT_FOUND", "No user with that id found");
    }

    // Get team member base info from team_members table (role, joined_at, note, is_active)
    const [memberRows] = await DB.query(
        `SELECT team_id, role, joined_at, note, is_active
        FROM team_members
        WHERE team_id = ? AND user_id = ?`,
        [teamId, userId]
    );
    if (memberRows.length === 0) {
        return error("NOT_FOUND", "No member with that id found");
    }
    const memberInfo = memberRows[0];

    // Get all positions from many-to-many table for this member
    const [positions] = await DB.query(
        `SELECT tp.id, tp.label
        FROM team_member_positions mp
        JOIN team_positions tp ON tp.id = mp.position_id
        WHERE mp.team_id = ? AND mp.user_id = ?
        ORDER BY tp.label`,
        [teamId, userId]
    );

    return success("MEMBER_FETCHED", "Successfully fetched member details", {
        ...user,
        teamContext: {
            ...memberInfo,
            positions: positions // array of position objects
        }
    });
};


const setMemberDetail = async (teamId, userId, updates) => {
    // 1) Guard basic
    const [[team]] = await DB.query("SELECT id FROM teams WHERE id = ?", [teamId]);
    if (!team) return error("TEAM_NOT_FOUND", "No team with that id found");

    const [[member]] = await DB.query(
        "SELECT id FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, userId]
    );
    if (!member) return error("NOT_FOUND", "No member with that id in this team");

    // 2) Partial update fields on team_members
    const allowed = ["role", "is_active", "note"];
    const sets = [];
    const vals = [];
    for (const key of allowed) {
        if (updates[key] !== undefined) { sets.push(`${key} = ?`); vals.push(updates[key]); }
    }
    if (sets.length) {
        sets.push("updated_at = NOW()");
        await DB.query(
            `UPDATE team_members SET ${sets.join(", ")} WHERE team_id = ? AND user_id = ?`,
            [...vals, teamId, userId]
        );
    }

    // 3) Positions (many-to-many)
    if (Array.isArray(updates.position_ids)) {
        await DB.query("START TRANSACTION");
        try {
            // Hapus semua posisi lama
            await DB.query(
                "DELETE FROM team_member_positions WHERE team_id = ? AND user_id = ?",
                [teamId, userId]
            );

            if (updates.position_ids.length) {
                const uniqueIds = [...new Set(updates.position_ids)];
                const rows = uniqueIds.map(pid => [crypto.randomUUID(), teamId, userId, pid]);
                await DB.query(
                    "INSERT INTO team_member_positions (id, team_id, user_id, position_id) VALUES ?",
                    [rows]
                );
            }

            await DB.query("COMMIT");
        } catch (err) {
            await DB.query("ROLLBACK");
            throw err;
        }
    }

    // 4) Return fresh data
    const [[updated]] = await DB.query(
        "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, userId]
    );
    const [pos] = await DB.query(
        `SELECT tp.id, tp.label
    FROM team_member_positions mp
    JOIN team_positions tp ON tp.id = mp.position_id
    WHERE mp.team_id = ? AND mp.user_id = ?
    ORDER BY tp.label`,
        [teamId, userId]
    );

    return success("MEMBER_UPDATED", "Member details updated successfully", {
        ...updated,
        positions: pos
    });
};


const addMemberToTeam = async (teamId, userIds) => {
    // Check if team exists
    const [teams] = await DB.query("SELECT * FROM teams WHERE id = ?", [teamId]);
    if (teams.length === 0) {
        return error("TEAM_NOT_FOUND", "No team with that id found");
    }

    // Filter valid users (exist + not already members)
    const validMembers = [];

    for (const userId of userIds) {
        const [users] = await DB.query("SELECT * FROM user WHERE id = ?", [userId]);
        if (users.length === 0) continue; // skip if user doesn't exist

        const [existing] = await DB.query(
            "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?",
            [teamId, userId]
        );
        if (existing.length > 0) continue;

        const id = uuidv4();
        validMembers.push([id, userId, teamId, 'member', 1]);
    }

    if (validMembers.length === 0) {
        return error("NO_VALID_MEMBERS", "No valid users to add");
    }

    // Bulk insert
    await DB.query(
        `INSERT INTO team_members
        (id, user_id, team_id, role,is_active, joined_at, created_at, updated_at) 
        VALUES ? `,
        [validMembers.map(v => [...v, new Date(), new Date(), new Date()])]
    );

    return success("MEMBERS_ADDED", `${validMembers.length} members successfully added to team`);
};


const removeMemberFromTeam = async (teamId, userId) => {
    // Check if member exists in that team
    const [members] = await DB.query(
        "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, userId]
    );
    if (members.length === 0) {
        return error("NOT_FOUND", "No such member in this team");
    }

    // Remove member
    await DB.query(
        "DELETE FROM team_members WHERE team_id = ? AND user_id = ?",
        [teamId, userId]
    );

    //delete all user positions on team
    await DB.query(
        "DELETE FROM team_member_positions WHERE team_id = ? AND user_id = ?",
        [teamId, userId]
    );

    return success("MEMBER_REMOVED", "Member successfully removed from team");
};


module.exports = {
    getAllMainTeams,
    getAllOtherTeams,
    getTeamMembers,
    getAllNonMembers,

    getAllPositions,
    createPosition,
    deletePosition,

    getMemberDetail,
    setMemberDetail,
    addMemberToTeam,
    removeMemberFromTeam,
};
