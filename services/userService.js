const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const DB = require("../config/db");
const { success, error } = require("../utils/response");

const getAllUsers = async () => {
    const [users] = await DB.query(`
        SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.last_login,
            r.name AS role_name
        FROM user u
        LEFT JOIN role r ON u.role_id = r.id
    `);

    return success("USERS_FETCHED", "Users successfully fetched.",
        users.map(user => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            role_name: user.role_name || "Unknown",
            last_login: user.last_login
        }))
    );
};

const getUserDetailById = async (userId) => {
    const [users] = await DB.query("SELECT * FROM user WHERE id = ?", [userId]);

    if (users.length === 0) {
        return error("USER_NOT_FOUND", "User not found.");
    }

    const user = users[0];
    const [roles] = await DB.query("SELECT name FROM role WHERE id = ?", [user.role_id]);
    const role_name = roles.length > 0 ? roles[0].name : "Unknown";

    // Only include safe fields
    const safeUser = {
        id: user.id,
        role_id: user.role_id,
        role_name,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        address: user.address,
        city: user.city,
        province: user.province,
        postal_code: user.postal_code,
        last_login: user.last_login,
        is_active: user.is_active,
        create_at: user.create_at,
        update_at: user.update_at,
        DOB: user.DOB
    };

    return success("USER_DETAIL_FETCHED", "User details successfully fetched.", safeUser);
};

const editUserProfile = async (userId, newData) => {
    // Only allow safe fields
    const allowedFields = [
        'first_name', 'last_name', 'phone_number',
        'address', 'city', 'province', 'postal_code', 'DOB'
    ];

    const fields = [];
    const values = [];

    for (const key of allowedFields) {
        if (newData[key] !== undefined) {
            fields.push(`${key} = ?`);
            values.push(newData[key]);
        }
    }

    if (fields.length === 0) {
        return error('NO_FIELDS_PROVIDED', 'No valid fields provided to update.');
    }

    values.push(userId); // for WHERE clause

    const query = `
        UPDATE user
        SET ${fields.join(', ')}
        WHERE id = ?
    `;

    await DB.query(query, values);

    const [updated] = await DB.query("SELECT * FROM user WHERE id = ?", [userId]);

    await DB.query("UPDATE user SET update_at = NOW() WHERE id = ?", [userId]);

    return success('PROFILE_UPDATED', 'Profile updated successfully.', updated[0]);
};

const setRole = async (id, roleName) => {
    // Check if user exists
    const [users] = await DB.query("SELECT * FROM user WHERE id = ?", [id]);
    if (users.length === 0) {
        return error("NOT_FOUND", "No user with that id found");
    }

    // Check if role exists
    const [roles] = await DB.query("SELECT * FROM role WHERE name = ?", [roleName]);
    if (roles.length === 0) {
        return error("NOT_FOUND", "No role with that name found");
    }
    const roleData = roles[0];

    // Update user's role and updated_at timestamp
    await DB.query(
        "UPDATE user SET role_id = ? WHERE id = ?",
        [roleData.id, id]
    );

    await DB.query("UPDATE user SET update_at = NOW() WHERE id = ?", [id]);

    return success("ROLE_CHANGED", "User role has successfully changed");
};


const setStatus = async (id, is_active) => {
    // Sanity check
    if (typeof is_active !== 'boolean') {
        return error("INVALID_TYPE", "is_active must be a boolean");
    }

    // Check if user exists
    const [users] = await DB.query("SELECT * FROM user WHERE id = ?", [id]);
    if (users.length === 0) {
        return error("NOT_FOUND", "No user with that id found");
    }

    // Update is_active and timestamp
    await DB.query(
        "UPDATE user SET is_active = ? WHERE id = ?",
        [is_active, id]
    );

    await DB.query("UPDATE user SET update_at = NOW() WHERE id = ?", [id]);

    return success("STATUS_CHANGED", "User status has successfully changed");
};

module.exports = {
    getAllUsers,
    getUserDetailById,
    editUserProfile,
    setRole,
    setStatus,
};