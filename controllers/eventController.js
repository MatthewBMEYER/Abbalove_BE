const eventService = require("../services/eventService");

// EVENTS ---------------------------------------

// get all event 
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


// get all event by group id for comcell
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

// create event
const createEvent = async (req, res) => {
    try {
        const { name, type, groupId, startTime, endTime, location } = req.body;
        const result = await eventService.createEvent(name, type, groupId, startTime, endTime, location);
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
        const { name, type, groupId, startTime, endTime, location } = req.body;
        const { id } = req.params;
        const result = await eventService.updateEvent(id, name, type, groupId, startTime, endTime, location);
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
    createEvent,
    deleteEvent,

    getAttendance,
    updateAttendance,
    getAttendanceStats,

};