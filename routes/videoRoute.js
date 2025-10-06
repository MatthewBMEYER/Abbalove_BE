const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");

// Video routes
router.post("/", videoController.addVideo);
router.get("/", videoController.getVideos);
router.get("/:id", videoController.getVideoById);
router.put("/:id", videoController.updateVideo);
router.delete("/:id", videoController.deleteVideo);

// Tag routes
router.get("/tags/all", videoController.getTags);
router.delete("/tags/:id", videoController.deleteTag);

module.exports = router;
