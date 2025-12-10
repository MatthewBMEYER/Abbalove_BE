const eventService = require("../services/coreEventService");

module.exports = {

    createEvent: async function (req, res) {
        try {
            const data = req.body
            const result = await eventService.createEvent(data);
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                code: "SERVER_ERROR",
                message: "Something went wrong.",
            });
        }
    },

    getAllEventPublic: async function (req, res) {
        try {
            const result = await eventService.getAllEventPublic();
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                code: "SERVER_ERROR",
                message: "Something went wrong.",
            });
        }
    },

    getAllPostEventPublic: async function (req, res) {
        try {
            const year = req.query.year
            const result = await eventService.getAllPostEventPublic(year);
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                code: "SERVER_ERROR",
                message: "Something went wrong.",
            });
        }
    },

    getAllEventAdmin: async function (req, res) {
        try {
            const filters = req.query
            const result = await eventService.getAllEventAdmin(filters);
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                code: "SERVER_ERROR",
                message: "Something went wrong.",
            });
        }
    },

    getAllPostEventAdmin: async function (req, res) {
        try {
            const year = req.query.year
            const filters = req.query
            const result = await eventService.getAllPostEventAdmin(year, filters);
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                code: "SERVER_ERROR",
                message: "Something went wrong.",
            });
        }
    },

    getEventById: async function (req, res) {
        try {
            const { id } = req.params;
            const result = await eventService.getEventById(id);
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                code: "SERVER_ERROR",
                message: "Something went wrong.",
            });
        }
    },

    updateEvent: async function (req, res) {
        try {
            const { id } = req.params;
            const data = req.body
            const result = await eventService.updateEvent(id, data);
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                code: "SERVER_ERROR",
                message: "Something went wrong.",
            });
        }
    },

    deleteEvent: async function (req, res) {
        try {
            const { id } = req.params;
            const result = await eventService.deleteEvent();
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            console.error(err);
            res.status(500).json({
                success: false,
                code: "SERVER_ERROR",
                message: "Something went wrong.",
            });
        }
    },

}