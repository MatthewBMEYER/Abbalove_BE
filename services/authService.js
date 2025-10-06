const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const DB = require("../config/db");
const { success, error } = require("../utils/response");
const nodemailer = require('nodemailer');

const SECRET = process.env.JWT_SECRET_KEY;
const JWT_EXPIRATION = process.env.TOKEN_EXPIRATION

//Reset Password Email Sender-----------------------------------------
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,     // your Gmail
        pass: process.env.EMAIL_PASS      // your app password
    }
});

const sendResetEmail = async (to, resetLink) => {
    const mailOptions = {
        from: `"Abbalove Service Support" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Reset Your Password',
        html: `
            <h3>Hello,</h3>
            <p>You requested a password reset. Click the link below to set a new password:</p>
            <a href="${resetLink}" target="_blank">Reset Password</a>
            <p>This link will expire in 5 minutes.</p>
        `
    };

    return transporter.sendMail(mailOptions);
};

module.exports = { sendResetEmail };
//---------------------------------------------------------------------

const register = async (firstName, lastName, email, password) => {

    console.log("[authService] password received:", password);

    const [existingUser] = await DB.query("SELECT * FROM user WHERE email = ?", [email]);

    if (existingUser.length > 0) {
        return error("EMAIL_ALREADY_EXISTS", "Email has already been registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const defaultRoleId = '4'; // default role ID for user


    await DB.query(
        "INSERT INTO user (id, role_id, first_name, last_name, email, password) VALUES (?, ?, ?, ?, ?, ?)",
        [id, defaultRoleId, firstName, lastName, email, hashedPassword]
    );

    const name = `${firstName} ${lastName}`;

    return success("USER_CREATED", "User successfully registered.", { id, name, email });
};

const login = async (email, password) => {
    const [users] = await DB.query("SELECT * FROM user WHERE email = ?", [email]);

    if (users.length === 0) {
        return error("INVALID_CREDENTIALS", "Email or password is incorrect.")
    }

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        //don't let them know the email exist
        return error("INVALID_CREDENTIALS", "Email or password is incorrect.")
    }

    await DB.query("UPDATE user SET last_login = NOW() WHERE id = ?", [user.id]);

    const token = jwt.sign(
        { id: user.id, email: user.email },
        SECRET,
        { expiresIn: process.env.JWT_EXPIRATION }
    );

    const [roles] = await DB.query("SELECT name FROM role WHERE id = ?", [user.role_id]);
    user.role_name = roles.length > 0 ? roles[0].name : "Unknown";

    return success("LOGIN_SUCCESS", "Login successful.", {
        token,
        user: {
            id: user.id,
            name: user.first_name + " " + user.last_name,
            email: user.email,
            roleId: user.role_id,
            roleName: user.role_name,
        },
    });
};

const getProfile = async (token) => {

    let payload;
    try {
        payload = jwt.verify(token, SECRET);
    } catch (err) {
        return error("INVALID_TOKEN", "token is invalid.");
    }

    // Fetch user from DB by ID
    const [users] = await DB.query("SELECT * FROM user WHERE id = ?", [payload.id]);
    if (users.length === 0) return res.status(404).json(error("USER_NOT_FOUND", "User not found"));

    const user = users[0];

    const [roles] = await DB.query("SELECT name FROM role WHERE id = ?", [user.role_id]);
    user.role_name = roles.length > 0 ? roles[0].name : "Unknown";

    return success("PROFILE_FETCHED", "Fetch profile successful.", {
        user: {
            id: user.id,
            name: user.first_name + " " + user.last_name,
            email: user.email,
            roleId: user.role_id,
            roleName: user.role_name,
        },
    });
};

const sendResetPasswordLink = async (email) => {

    const [users] = await DB.query("SELECT * FROM user WHERE email = ?", [email]);

    if (users.length === 0) {
        return error("INVALID EMAIL", "Email didn't exist");
    }

    const user = users[0];

    // Create reset token (15 mins expiry)
    const resetToken = jwt.sign(
        { id: user.id, email: user.email },
        SECRET,
        { expiresIn: '5m' }
    );


    const resetLink = `${process.env.WEB_URL}/set-password/${resetToken}`;

    // Sending to destination email
    await sendResetEmail(email, resetLink);

    return success("EMAIL_SENT", "The reset link has been sent")
};

const resetPassword = async (token, newPassword) => {

    if (!token || !newPassword) {
        return error("INVALID_REQUEST", "Token or new password didn't exist");
    }

    // Verify the token
    let payload;
    try {
        payload = jwt.verify(token, SECRET);
    } catch (err) {
        return error("INVALID_REQUEST", "Reset link is invalid or has expired.");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update in database
    await DB.query("UPDATE user SET password = ? WHERE id = ?", [
        hashedPassword,
        payload.id
    ]);

    await DB.query("UPDATE user SET update_at = NOW() WHERE id = ?", [payload.id]);

    return success("PASSWORD_CHANGED", "Your password has successfully changed");
};

module.exports = {
    register,
    login,
    getProfile,
    sendResetPasswordLink,
    resetPassword,
};
