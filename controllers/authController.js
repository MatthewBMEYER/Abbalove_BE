const authService = require("../services/authService");

const registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const result = await authService.register(firstName, lastName, email, password);
        res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Something went wrong.",
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Something went wrong.",
        });
    }
};

const getProfile = async (req, res) => {
    try {
        const { token } = req.body;
        const result = await authService.getProfile(token);

        if (!result.success) {
            if (result.code === "INVALID_TOKEN") {
                return res.status(401).json(result);
            }
            return res.status(400).json(result);
        }

        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Something went wrong."
        });
    }
};


const requestResetPasswordLink = async (req, res) => {
    try {
        const { email } = req.body;
        const result = await authService.sendResetPasswordLink(email);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Something went wrong.",
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const result = await authService.resetPassword(token, newPassword);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Something went wrong.",
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getProfile,
    requestResetPasswordLink,
    resetPassword,
};
