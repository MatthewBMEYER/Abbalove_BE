const eventService = require("../services/eventService");

// EVENTS ---------------------------------------

// get all public events
const getAllEvent = async (req, res) => {
    try {
        const result = await eventService.getAllEvent();
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

// get all events by group id (both public and private comcell events)
const getAllEventByGroupId = async (req, res) => {
    try {
        const groupId = req.params.id;
        const result = await eventService.getAllEventByGroupId(groupId);
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

// get only comcell events by group id
const getComcellEventsByGroupId = async (req, res) => {
    try {
        const groupId = req.params.id;
        const result = await eventService.getComcellEventsByGroupId(groupId);
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

// create public event
const createPublicEvent = async (req, res) => {
    try {
        const { name, type, startTime, endTime, location, description, createdBy } = req.body;
        const result = await eventService.createPublicEvent(name, type, startTime, endTime, location, description, createdBy);
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

// create comcell event (private event for groups)
const createComcellEvent = async (req, res) => {
    try {
        const { name, type, groupIds, startTime, endTime, location, description, createdBy } = req.body;
        const result = await eventService.createComcellEvent(name, type, groupIds, startTime, endTime, location, description, createdBy);
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

// generic event creation (future-proof)
const createEvent = async (req, res) => {
    try {
        const { name, type, startTime, endTime, location, description, createdBy, isPublic, groupIds } = req.body;

        const eventData = {
            name,
            type,
            startTime,
            endTime,
            location,
            description,
            createdBy
        };

        const context = {
            isPublic: isPublic !== undefined ? isPublic : true,
            groupIds: groupIds || null
        };

        const result = await eventService.createEvent(eventData, context);
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

// update event
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, startTime, endTime, location, description, isPublic } = req.body;

        const eventData = {
            name,
            type,
            startTime,
            endTime,
            location,
            description,
            isPublic
        };

        const result = await eventService.updateEvent(id, eventData);
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

// delete event
const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await eventService.deleteEvent(id);
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

// ATTENDANCE FOR EVENT --------------------------------

// get attendance
const getAttendance = async (req, res) => {
    try {
        const { eventIds } = req.body;
        const result = await eventService.getAttendance(eventIds);
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

// update attendance
const updateAttendance = async (req, res) => {
    try {
        const { updates } = req.body;
        const result = await eventService.updateAttendance(updates);
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

// get attendance stats
const getAttendanceStats = async (req, res) => {
    try {
        const { groupId } = req.params;
        const result = await eventService.getAttendanceStats(groupId);
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
    getAllEvent,
    getAllEventByGroupId,
    getComcellEventsByGroupId,
    createPublicEvent,
    createComcellEvent,
    createEvent,
    updateEvent,
    deleteEvent,

    getAttendance,
    updateAttendance,
    getAttendanceStats,
};