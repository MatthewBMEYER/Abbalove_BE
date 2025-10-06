const comcellService = require("../services/comcellService");

// Create Group
const createComcellGroup = async (req, res) => {
    try {
        const { name, category, leaderId, coLeaderId, description, memberIds } = req.body;
        const result = await comcellService.createComcellGroup(name, category, leaderId, coLeaderId, description, memberIds);
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

// Delete Group
const deleteComcellGroup = async (req, res) => {
    try {
        const { id } = req.params; // /comcell/groups/:id
        const result = await comcellService.deleteComcellGroup(id);
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

// Update Group
const updateComcellGroup = async (req, res) => {
    try {
        const { id } = req.params; // /comcell/groups/:id
        const { name, category, leader_id, co_leader_id, description } = req.body;
        const result = await comcellService.updateComcellGroup(id, { name, category, leader_id, co_leader_id, description });
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

// Get all Comcell Groups
const getAllComcell = async (req, res) => {
    try {
        const result = await comcellService.getAllComcell();
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

//Get Detail for one group
const getComcellGroupDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await comcellService.getComcellGroupDetail(id);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

// Get all Adult Comcell Groups
const getAllAdultComcell = async (req, res) => {
    try {
        const result = await comcellService.getAllAdultComcell();
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

// Get all Youth Comcell Groups
const getAllYouthComcell = async (req, res) => {
    try {
        const result = await comcellService.getAllYouthComcell();
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

// Get members of a group
const getComcellGroupMembers = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await comcellService.getComcellGroupMembers(id);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

// Get detail of a member in a group
const getMemberDetail = async (req, res) => {
    try {
        const { groupId, memberId } = req.body;
        const result = await comcellService.getMemberDetail(groupId, memberId);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

const getComcellFromUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await comcellService.getComcellFromUserId(userId);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

// Update member details (e.g. role)
const setMemberDetail = async (req, res) => {
    try {
        const { groupId, memberId, role } = req.body;
        const result = await comcellService.setMemberDetail(groupId, memberId, role);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

// Add member to a group
const addMemberToComcellGroup = async (req, res) => {
    try {
        const { groupId, userIds } = req.body;
        const result = await comcellService.addMemberToComcellGroup(groupId, userIds);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

// Remove member from a group
const removeMemberFromComcellGroup = async (req, res) => {
    try {
        const { groupId, userId } = req.body;
        const result = await comcellService.removeMemberFromComcellGroup(groupId, userId);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, code: "SERVER_ERROR", message: "Something went wrong." });
    }
};

module.exports = {
    createComcellGroup,
    deleteComcellGroup,
    updateComcellGroup,

    getAllComcell,
    getAllAdultComcell,
    getAllYouthComcell,

    getComcellGroupMembers,
    getComcellFromUserId,
    getMemberDetail,
    setMemberDetail,
    addMemberToComcellGroup,
    removeMemberFromComcellGroup,

    getComcellGroupDetail,
};
