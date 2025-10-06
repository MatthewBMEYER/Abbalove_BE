const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const DB = require("../config/db");
const { success, error } = require("../utils/response");
const userService = require("./userService");

// Create Comcell Group
const createComcellGroup = async (
    name,
    category,
    leaderId,
    coLeaderId = null,
    description = null,
    memberIds = []
) => {
    // validate leader
    const [users] = await DB.query("SELECT * FROM user WHERE id = ?", [leaderId]);
    if (users.length === 0) {
        return error("LEADER_NOT_FOUND", "Leader user not found");
    }

    // Make sure leader is not already in another group
    const [leaderAssigned] = await DB.query(
        "SELECT * FROM comcell_group_members WHERE user_id = ?",
        [leaderId]
    );
    if (leaderAssigned.length > 0) {
        return error("LEADER_ALREADY_ASSIGNED", "Leader already belongs to a group");
    }

    // If co-leader is provided, validate
    if (coLeaderId) {
        const [coUsers] = await DB.query("SELECT * FROM user WHERE id = ?", [coLeaderId]);
        if (coUsers.length === 0) {
            return error("COLEADER_NOT_FOUND", "Co-Leader user not found");
        }

        // Make sure co-leader is not already in another group
        const [coLeaderAssigned] = await DB.query(
            "SELECT * FROM comcell_group_members WHERE user_id = ?",
            [coLeaderId]
        );
        if (coLeaderAssigned.length > 0) {
            return error("COLEADER_ALREADY_ASSIGNED", "Co-Leader already belongs to a group");
        }

        // Prevent same person being both leader & co-leader
        if (leaderId === coLeaderId) {
            return error("DUPLICATE_LEADER", "Leader and Co-Leader cannot be the same user");
        }
    }

    // generate group id
    const shortId = uuidv4().split("-")[0];
    const groupId = `Group-${shortId}`;

    // insert group
    await DB.query(
        "INSERT INTO comcell_group (id, name, category, description, leader_id, co_leader_id, create_at, update_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
        [groupId, name, category, description, leaderId, coLeaderId]
    );

    // add leader as member with role = leader
    await DB.query(
        "INSERT INTO comcell_group_members (id, group_id, user_id, role, join_at, update_at) VALUES (?, ?, ?, 'leader', NOW(), NOW())",
        [uuidv4(), groupId, leaderId]
    );

    // add co-leader as member with role = co-leader
    if (coLeaderId) {
        await DB.query(
            "INSERT INTO comcell_group_members (id, group_id, user_id, role, join_at, update_at) VALUES (?, ?, ?, 'co-leader', NOW(), NOW())",
            [uuidv4(), groupId, coLeaderId]
        );
    }

    // call addMembers service if extra members are provided
    if (memberIds.length > 0) {
        const addResult = await addMembersToComcellGroup(groupId, memberIds);
        if (!addResult.success) {
            return addResult; // bubble up any errors like USER_ALREADY_ASSIGNED
        }
    }

    return success("GROUP_CREATED", "Comcell group created successfully", { id: groupId });
};


// Delete Comcell Group
const deleteComcellGroup = async (groupId) => {
    // check if exists
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }

    await DB.query("DELETE FROM comcell_group WHERE id = ?", [groupId]);

    return success("GROUP_DELETED", "Comcell group deleted successfully");
};

// Update Comcel Group
const updateComcellGroup = async (groupId, { name, category, leader_id, co_leader_id, description }) => {
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }

    const currentGroup = group[0];

    try {
        // Update the main group table
        await DB.query(
            "UPDATE comcell_group SET name = ?, category = ?, leader_id = ?, co_leader_id = ?, description = ?, update_at = NOW() WHERE id = ?",
            [name, category, leader_id, co_leader_id, description, groupId]
        );

        // Handle leader role changes
        if (leader_id !== currentGroup.leader_id) {
            // Remove leader role from previous leader (set to member)
            if (currentGroup.leader_id) {
                await DB.query(
                    "UPDATE comcell_group_members SET role = 'member', update_at = NOW() WHERE group_id = ? AND user_id = ?",
                    [groupId, currentGroup.leader_id]
                );
            }

            // Set new leader role
            if (leader_id) {
                // Check if the new leader is already a member
                const [existingMember] = await DB.query(
                    "SELECT * FROM comcell_group_members WHERE group_id = ? AND user_id = ?",
                    [groupId, leader_id]
                );

                if (existingMember.length > 0) {
                    // Update existing member to leader
                    await DB.query(
                        "UPDATE comcell_group_members SET role = 'leader', update_at = NOW() WHERE group_id = ? AND user_id = ?",
                        [groupId, leader_id]
                    );
                } else {
                    // Add new leader as member
                    await DB.query(
                        "INSERT INTO comcell_group_members (group_id, user_id, role, created_at, update_at) VALUES (?, ?, 'leader', NOW(), NOW())",
                        [groupId, leader_id]
                    );
                }
            }
        }

        // Handle co-leader role changes
        if (co_leader_id !== currentGroup.co_leader_id) {
            // Remove co-leader role from previous co-leader (set to member)
            if (currentGroup.co_leader_id) {
                await DB.query(
                    "UPDATE comcell_group_members SET role = 'member', update_at = NOW() WHERE group_id = ? AND user_id = ?",
                    [groupId, currentGroup.co_leader_id]
                );
            }

            // Set new co-leader role
            if (co_leader_id) {
                // Check if the new co-leader is already a member
                const [existingMember] = await DB.query(
                    "SELECT * FROM comcell_group_members WHERE group_id = ? AND user_id = ?",
                    [groupId, co_leader_id]
                );

                if (existingMember.length > 0) {
                    // Update existing member to co-leader
                    await DB.query(
                        "UPDATE comcell_group_members SET role = 'co-leader', update_at = NOW() WHERE group_id = ? AND user_id = ?",
                        [groupId, co_leader_id]
                    );
                } else {
                    // Add new co-leader as member
                    await DB.query(
                        "INSERT INTO comcell_group_members (group_id, user_id, role, created_at, update_at) VALUES (?, ?, 'co-leader', NOW(), NOW())",
                        [groupId, co_leader_id]
                    );
                }
            }
        }

        return success("GROUP_UPDATED", "Comcell group updated successfully");

    } catch (error) {
        console.error("Error updating group:", error);
        return error("UPDATE_FAILED", "Failed to update group");
    }
};

// Get All Comcell
const getAllComcell = async () => {
    const [groups] = await DB.query(`
        SELECT 
            g.*, 
            COUNT(m.id) AS member_count,
            CONCAT(u.first_name, ' ', u.last_name) AS leader_name,
            CONCAT(cu.first_name, ' ', cu.last_name) AS co_leader_name
        FROM comcell_group g
        LEFT JOIN comcell_group_members m ON g.id = m.group_id
        LEFT JOIN user u ON g.leader_id = u.id
        LEFT JOIN user cu ON g.co_leader_id = cu.id
        GROUP BY g.id
    `);

    return success("GROUP_FETCHED", "All groups successfully fetched", groups);
};

//Get group detail using user Id
const getComcellFromUserId = async (userId) => {
    const [groups] = await DB.query(`
        SELECT * FROM comcell_group_members WHERE user_id = ? `, [userId]);
    if (groups.length === 0) {
        return error("NOT_FOUND", "user haven't join any comcell group");
    }

    return await getComcellGroupDetail(groups[0].group_id);
};

//Get detail for one Group
const getComcellGroupDetail = async (groupId) => {
    const [group] = await DB.query(`
        SELECT 
            g.*, 
            COUNT(m.id) AS member_count,
            CONCAT(u.first_name, ' ', u.last_name) AS leader_name,
            CONCAT(cu.first_name, ' ', cu.last_name) AS co_leader_name
        FROM comcell_group g
        LEFT JOIN comcell_group_members m ON g.id = m.group_id
        LEFT JOIN user u ON g.leader_id = u.id
        LEFT JOIN user cu ON g.co_leader_id = cu.id
        WHERE g.id = ?
        GROUP BY g.id
    `, [groupId]);

    if (!group || group.length === 0) {
        return error("GROUP_NOT_FOUND", "Comcell group not found");
    }

    return success("GROUP_DETAIL_FETCHED", "Group detail successfully fetched", group[0]);
};


// Get All Adult Comcell
const getAllAdultComcell = async () => {
    const [groups] = await DB.query(`
        SELECT 
            g.*, 
            COUNT(m.id) AS member_count,
            CONCAT(u.first_name, ' ', u.last_name) AS leader_name,
            CONCAT(cu.first_name, ' ', cu.last_name) AS co_leader_name
        FROM comcell_group g
        LEFT JOIN comcell_group_members m ON g.id = m.group_id
        LEFT JOIN user u ON g.leader_id = u.id
        LEFT JOIN user cu ON g.co_leader_id = cu.id
        WHERE g.category = 'Adult'
        GROUP BY g.id
    `);

    return success("GROUP_FETCHED", "All adult group successfully fetched", groups);
};


// Get All Youth Comcell
const getAllYouthComcell = async () => {
    const [groups] = await DB.query(`
        SELECT 
            g.*, 
            COUNT(m.id) AS member_count,
            CONCAT(u.first_name, ' ', u.last_name) AS leader_name,
            CONCAT(cu.first_name, ' ', cu.last_name) AS co_leader_name
        FROM comcell_group g
        LEFT JOIN comcell_group_members m ON g.id = m.group_id
        LEFT JOIN user u ON g.leader_id = u.id
        LEFT JOIN user cu ON g.co_leader_id = cu.id
        WHERE g.category = 'Youth'
        GROUP BY g.id
    `);

    return success("GROUP_FETCHED", "All youth group successfully fetched", groups);
};

//get All Comcell Group Members 
const getComcellGroupMembers = async (groupId) => {
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }

    const [members] = await DB.query(`
        SELECT 
            m.id,
            m.group_id,
            m.user_id,
            m.role,
            m.join_at,
            m.update_at,
            CONCAT(u.first_name, ' ', u.last_name) AS name
        FROM comcell_group_members m
        LEFT JOIN user u ON m.user_id = u.id
        WHERE m.group_id = ?
    `, [groupId]);

    return success("GROUP_MEMBERS_FETCHED", "All group members successfully fetched", members);
};


const getMemberDetail = async (groupId, memberId) => {

    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");

    }

    const user = await userService.getUserDetailById(memberId);
    if (!user) {
        return error("USER_NOT_FOUND", "No user with that id found");
    }

    const memberInfo = await DB.query("SELECT * FROM comcell_group_members WHERE group_id = ? AND user_id = ?", [groupId, memberId]);

    return success("MEMBER_FETCHED", "Successfully fetched member details", {
        ...user,
        comcellContext: {
            ...memberInfo,
        }
    })

};

const setMemberDetail = async (groupId, memberId, role) => {

    //notes
    //setMemberDetail currently only use for set Role, in the future it will also used for chaging other details

    // check Group
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");

    }

    // check member
    const [members] = await DB.query("SELECT * FROM comcell_group_members WHERE group_id = ? AND user_id = ?", [groupId, memberId]);
    if (members.length === 0) {
        return error("NOT_FOUND", "No member with that id found")
    }
    const member = members[0];

    // check Role
    if (role !== 'member' && role !== 'leader' && role !== 'co-leader') {
        return error("INVALID_ROLE", "Invalid role");
    }

    await DB.query("UPDATE comcell_group_members SET role = ? , update_at = NOW() WHERE group_id = ? AND user_id = ?", [role, groupId, memberId]);
    return success("MEMBER_UPDATED", "Member details updated successfully");
};

const addMemberToComcellGroup = async (groupId, userIds = []) => {
    // Check if group exists
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }

    // Verify users exist
    const [users] = await DB.query(
        "SELECT id FROM user WHERE id IN (?)",
        [userIds]
    );
    if (users.length !== userIds.length) {
        return error("USER_NOT_FOUND", "One or more users do not exist");
    }

    // Ensure users aren’t already in another group
    const [existing] = await DB.query(
        `SELECT u.id, CONCAT(u.first_name," ",u.last_name) as name, cgm.group_id 
     FROM comcell_group_members cgm
     JOIN user u ON u.id = cgm.user_id
     WHERE cgm.user_id IN (?)`,
        [userIds]
    );

    if (existing.length > 0) {
        const names = existing.map(e => e.name).join(", ");
        return error(
            "USER_ALREADY_ASSIGNED",
            `User(s) ${names} already assigned to another group`
        );
    }

    const defaultRole = "member";

    // Build values for bulk insert
    const values = userIds.map((userId) => [
        uuidv4(),
        groupId,
        userId,
        defaultRole,
        new Date(),
        new Date()
    ]);

    await DB.query(
        `INSERT INTO comcell_group_members
            (id, group_id, user_id, role, join_at, update_at) 
        VALUES ? `,
        [values]
    );

    return success("MEMBERS_ADDED", `${userIds.length} members successfully added to group`);
};



const removeMemberFromComcellGroup = async (groupId, userId) => {
    // Check if group exists
    const [group] = await DB.query("SELECT * FROM comcell_group WHERE id = ?", [groupId]);
    if (group.length === 0) {
        return error("GROUP_NOT_FOUND", "No group with that id found");
    }

    // Check user membership
    const [users] = await DB.query(
        "SELECT * FROM comcell_group_members WHERE group_id = ? AND user_id = ?",
        [groupId, userId]
    );
    if (users.length === 0) {
        return error("USER_NOT_FOUND", "No user with that id found in this group");
    }

    // Prevent removing leader or co-leader
    const memberRole = users[0].role;
    if (memberRole === "leader" || memberRole === "co-leader") {
        return error(
            "CANNOT_REMOVE",
            `${memberRole} cannot be removed directly.Please delegate their role first.`
        );
    }

    // Proceed with deletion
    await DB.query(
        "DELETE FROM comcell_group_members WHERE group_id = ? AND user_id = ?",
        [groupId, userId]
    );

    return success("MEMBER_REMOVED", "Member successfully removed from group");
};

module.exports = {

    createComcellGroup,
    deleteComcellGroup,
    updateComcellGroup,

    getAllComcell,
    getAllAdultComcell,
    getAllYouthComcell,
    getComcellFromUserId,

    getComcellGroupMembers,
    getMemberDetail,
    setMemberDetail,
    addMemberToComcellGroup,
    removeMemberFromComcellGroup,

    getComcellGroupDetail,
};
