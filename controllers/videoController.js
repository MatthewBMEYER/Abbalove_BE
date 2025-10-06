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
// Get all videos (with optional search)
// ================================
const getVideos = async (req, res) => {
    try {
        const search = req.query.search || "";
        const result = await videoService.getAllVideos(search);
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
    getVideoById,
    updateVideo,
    deleteVideo,
    getTags,
    deleteTag,
};
