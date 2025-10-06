const userService = require("../services/userService");

const getAllUsers = async (req, res) => {
    try {
        const result = await userService.getAllUsers();
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

const getUserDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        const result = await userService.getUserDetailById(userId);
        res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Something went wrong.",
        });
    }
};

const editProfile = async (req, res) => {
    try {
        const user = req.user;
        const newData = req.body;
        const result = await userService.editUserProfile(user.id, newData);
        res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            code: "SERVER_ERROR",
            message: "Something went wrong.",
        });
    }
};


const setRole = async (req, res) => {
    try {
        const id = req.params.id;
        const { role } = req.body
        const result = await userService.setRole(id, role);
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

const setStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { is_active } = req.body
        const result = await userService.setStatus(id, is_active);
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
    getAllUsers,
    getUserDetails,
    editProfile,
    setRole,
    setStatus,
};

