const { v4: uuidv4 } = require("uuid");
const DB = require("../config/db");
const { success, error } = require("../utils/response");

// ================================
// VIDEO SECTION
// ================================

// Create a new video
const createVideo = async (data) => {
    try {
        const id = uuidv4();
        const { title, youtube_url, embed_url, thumbnail_url, description, event_date, createBy, tags = [] } = data;

        if (!title || !youtube_url) {
            return error("INVALID_INPUT", "Title and YouTube URL are required.");
        }

        await DB.query(
            `INSERT INTO videos (id, title, youtube_url, embed_url, thumbnail_url, description, event_date, createBy)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, title, youtube_url, embed_url, thumbnail_url, description, event_date, createBy]
        );

        // Attach tags if provided
        if (tags.length > 0) {
            await attachTagsToVideo(id, tags);
        }

        return success("CREATE_SUCCESS", "Video created successfully.", { id });
    } catch (err) {
        console.error("createVideo error:", err);
        return error("CREATE_FAILED", "Failed to create video.", err);
    }
};

// Setting video visibility
const setVisibility = async (id, isActive) => {
    try {
        const [videos] = await DB.query(`SELECT * FROM videos WHERE id = ?`, [id]);

        if (!videos.length) {
            return error("VIDEO_NOT_FOUND", "Video not found.");
        }

        await DB.query(`UPDATE videos SET isActive = ?, updateDate = NOW() WHERE id = ? `, [isActive, id]);

        return success("UPDATE_SUCCESS", "Visibility updated successfully.", { id, isActive });
    } catch (err) {
        console.error("setVisibility error:", err);
        return error("UPDATE_FAILED", "Failed to update visibility.", err);
    }
};


// Public: Get all active videos (with optional search)
const getAllVideos = async (search = "") => {
    try {
        const like = `%${search}%`;

        const [videos] = await DB.query(
            `SELECT * FROM videos 
             WHERE isActive = 1
             AND(title LIKE ? OR description LIKE ?)
             AND isDeleted = 0
             ORDER BY createDate DESC`,
            [like, like]
        );

        if (!videos.length) {
            return error("NO_VIDEOS_FOUND", "No videos found.");
        }

        // Attach tags
        for (const video of videos) {
            const [tags] = await DB.query(
                `SELECT t.id, t.name 
                 FROM video_tags vt
                 JOIN tags t ON vt.tag_id = t.id
                 WHERE vt.video_id = ? `,
                [video.id]
            );
            video.tags = tags;
        }

        return success("FETCH_SUCCESS", "Videos retrieved successfully.", videos);
    } catch (err) {
        console.error("getAllVideos error:", err);
        return error("FETCH_FAILED", "Failed to fetch videos.", err);
    }
};

// Admin: Get all videos (with optional search and date filter)
const getAllVideosAdmin = async (search = "", startDate = null, endDate = null) => {
    try {
        const like = `%${search}%`;
        let query = `
            SELECT * FROM videos 
            WHERE(title LIKE ? OR description LIKE ?) AND isDeleted = 0
                `;
        const params = [like, like];

        // Optional date filter
        if (startDate && endDate) {
            query += ` AND createDate BETWEEN ? AND ? `;
            params.push(startDate, endDate);
        }

        query += ` ORDER BY createDate DESC`;

        const [videos] = await DB.query(query, params);

        if (!videos.length) {
            return error("NO_VIDEOS_FOUND", "No videos found.");
        }

        // Attach tags
        for (const video of videos) {
            const [tags] = await DB.query(
                `SELECT t.id, t.name 
                 FROM video_tags vt
                 JOIN tags t ON vt.tag_id = t.id
                 WHERE vt.video_id = ? `,
                [video.id]
            );
            video.tags = tags;
        }

        return success("FETCH_SUCCESS", "Admin videos retrieved successfully.", videos);
    } catch (err) {
        console.error("getAllVideosAdmin error:", err);
        return error("FETCH_FAILED", "Failed to fetch admin videos.", err);
    }
};

// Get single video by ID
const getVideoById = async (id) => {
    try {
        const [rows] = await DB.query(`SELECT * FROM videos WHERE id = ? AND isActive = 1`, [id]);

        if (!rows.length) {
            return error("VIDEO_NOT_FOUND", "Video not found.");
        }

        const video = rows[0];
        const [tags] = await DB.query(
            `SELECT t.id, t.name 
             FROM video_tags vt
             JOIN tags t ON vt.tag_id = t.id
             WHERE vt.video_id = ? `,
            [id]
        );
        video.tags = tags;

        return success("FETCH_SUCCESS", "Video retrieved successfully.", video);
    } catch (err) {
        console.error("getVideoById error:", err);
        return error("FETCH_FAILED", "Failed to fetch video.", err);
    }
};

// Update video details
const updateVideo = async (id, data) => {
    try {
        const { title, youtube_url, embed_url, thumbnail_url, description, event_date, isActive, tags = [] } = data;

        const [exists] = await DB.query(`SELECT id FROM videos WHERE id = ? `, [id]);
        if (!exists.length) {
            return error("VIDEO_NOT_FOUND", "Video not found.");
        }

        await DB.query(
            `UPDATE videos 
             SET title =?, youtube_url =?, embed_url =?, thumbnail_url =?, description =?, event_date =?, isActive =?, updateDate = NOW()
             WHERE id =? `,
            [title, youtube_url, embed_url, thumbnail_url, description, event_date, isActive, id]
        );

        // Update tags if provided
        if (Array.isArray(tags)) {
            await DB.query(`DELETE FROM video_tags WHERE video_id = ? `, [id]);
            await attachTagsToVideo(id, tags);
        }

        return success("UPDATE_SUCCESS", "Video updated successfully.");
    } catch (err) {
        console.error("updateVideo error:", err);
        return error("UPDATE_FAILED", "Failed to update video.", err);
    }
};

// Delete video (soft delete)
const deleteVideo = async (id) => {
    try {
        const [exists] = await DB.query(`SELECT id FROM videos WHERE id = ? `, [id]);
        if (!exists.length) {
            return error("VIDEO_NOT_FOUND", "Video not found.");
        }

        await DB.query(`UPDATE videos SET isActive = 0, isDeleted = 1, updateDate = NOW() WHERE id = ? `, [id]);

        return success("DELETE_SUCCESS", "Video deleted successfully.");
    } catch (err) {
        console.error("deleteVideo error:", err);
        return error("DELETE_FAILED", "Failed to delete video.", err);
    }
};

// ================================
// TAG SECTION
// ================================

// Create or get existing tag(s) and link them to a video
const attachTagsToVideo = async (videoId, tagNames = []) => {
    for (const tagName of tagNames) {
        const trimmed = tagName.trim();
        if (!trimmed) continue;

        let tagId;
        const [existing] = await DB.query(`SELECT id FROM tags WHERE name = ? LIMIT 1`, [trimmed]);

        if (existing.length) {
            tagId = existing[0].id;
        } else {
            tagId = uuidv4();
            await DB.query(`INSERT INTO tags(id, name) VALUES(?, ?)`, [tagId, trimmed]);
        }

        const videoTagId = uuidv4();
        await DB.query(`INSERT INTO video_tags(id, video_id, tag_id) VALUES(?, ?, ?)`, [
            videoTagId,
            videoId,
            tagId,
        ]);
    }
};

// Get all tags
const getAllTags = async () => {
    try {
        const [tags] = await DB.query(`SELECT * FROM tags WHERE isActive = 1 ORDER BY name ASC`);
        if (!tags.length) return error("NO_TAGS_FOUND", "No tags found.");
        return success("FETCH_SUCCESS", "Tags retrieved successfully.", tags);
    } catch (err) {
        console.error("getAllTags error:", err);
        return error("FETCH_FAILED", "Failed to fetch tags.", err);
    }
};

// Delete tag (soft delete)
const deleteTag = async (id) => {
    try {
        const [exists] = await DB.query(`SELECT id FROM tags WHERE id = ? `, [id]);
        if (!exists.length) return error("TAG_NOT_FOUND", "Tag not found.");

        await DB.query(`UPDATE tags SET isActive = 0 WHERE id = ? `, [id]);
        return success("DELETE_SUCCESS", "Tag deleted successfully.");
    } catch (err) {
        console.error("deleteTag error:", err);
        return error("DELETE_FAILED", "Failed to delete tag.", err);
    }
};

// ================================
// EXPORT
// ================================
module.exports = {
    createVideo,
    getAllVideos,
    getAllVideosAdmin,
    setVisibility,
    getVideoById,
    updateVideo,
    deleteVideo,
    getAllTags,
    deleteTag,
};
