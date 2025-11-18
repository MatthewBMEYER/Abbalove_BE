const videoService = require("../services/videoService");
const { success, error } = require("../utils/response");

// ================================
// Add new video
// ================================
const addVideo = async (req, res) => {
    try {
        const result = await videoService.createVideo(req.body);
        return res.status(result.success ? 201 : 400).json(result);
    } catch (err) {
        console.error("addVideo controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};

// ================================
// Get all videos (with optional search and pagination)
// ================================
const getVideos = async (req, res) => {
    try {
        const search = req.query.search || "";
        const tag = req.query.tag || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const result = await videoService.getAllVideos(search, tag, page, limit);
        return res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error("getVideos controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};

// ==============================
// Get all videos for admin ( optional search and dates )
// ==============================
const getVideosAdmin = async (req, res) => {
    try {
        const search = req.query.search || "";
        const startDate = req.query.startDate || null;
        const endDate = req.query.endDate || null;
        const result = await videoService.getAllVideosAdmin(search, startDate, endDate);
        return res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error("getVideos controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};

// ================================
// Get single video by ID
// ================================
const getVideoById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await videoService.getVideoById(id);
        return res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error("getVideoById controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};

// ================================
// Set video visibility ( is_active )
// ================================
const setVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const result = await videoService.setVisibility(id, isActive);
        return res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error("setVisibility controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};


// ================================
// Update video
// ================================
const updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await videoService.updateVideo(id, req.body);
        return res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error("updateVideo controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};

// ================================
// Delete video (soft delete)
// ================================
const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await videoService.deleteVideo(id);
        return res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error("deleteVideo controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};

// ================================
// TAGS — get all tags
// ================================
const getTags = async (req, res) => {
    try {
        const result = await videoService.getAllTags();
        return res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error("getTags controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};

// ================================
// TAGS — delete tag
// ================================
const deleteTag = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await videoService.deleteTag(id);
        return res.status(result.success ? 200 : 404).json(result);
    } catch (err) {
        console.error("deleteTag controller error:", err);
        return res.status(500).json(error("INTERNAL_ERROR", "Internal server error.", err));
    }
};

// ================================
// EXPORTS
// ================================
module.exports = {
    addVideo,
    getVideos,
    getVideosAdmin,
    getVideoById,
    setVisibility,
    updateVideo,
    deleteVideo,
    getTags,
    deleteTag,
};
