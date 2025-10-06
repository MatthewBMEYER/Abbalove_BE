const teamService = require("../services/teamService");

const getAllMainTeams = async (req, res) => {
    try {
        const result = await teamService.getAllMainTeams();
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

const getAllOtherTeams = async (req, res) => {
    try {
        const result = await teamService.getAllOtherTeams();
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

const getTeamMembers = async (req, res) => {
    try {
        const { teamId } = req.body
        const result = await teamService.getTeamMembers(teamId);
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

const getAllNonMembers = async (req, res) => {
    try {
        const { teamId } = req.body
        const result = await teamService.getAllNonMembers(teamId);
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

const getAllPositions = async (req, res) => {
    try {
        const { teamId } = req.body
        const result = await teamService.getAllPositions(teamId);
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

const createPosition = async (req, res) => {
    try {
        const { teamId, label } = req.body
        const result = await teamService.createPosition(teamId, label);
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

const deletePosition = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await teamService.deletePosition(id);
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

const getMemberDetail = async (req, res) => {
    try {
        const { teamId, userId } = req.body
        const result = await teamService.getMemberDetail(teamId, userId);
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

const setMemberDetail = async (req, res) => {
    try {
        const { teamId, id, ...updates } = req.body;

        const result = await teamService.setMemberDetail(teamId, id, updates);

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

const addMemberToTeam = async (req, res) => {
    try {
        const { teamId } = req.body
        const { userIds } = req.body
        const result = await teamService.addMemberToTeam(teamId, userIds);
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

const removeMemberFromTeam = async (req, res) => {
    try {
        const { teamId, userId } = req.body
        const result = await teamService.removeMemberFromTeam(teamId, userId);
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

