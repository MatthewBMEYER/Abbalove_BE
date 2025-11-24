const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

// Event routes
router.get('/getAll', eventController.getAllEvent);
router.get('/getAllEventByGroupId/:id', eventController.getAllEventByGroupId);
router.get('/getComcellEventsByGroupId/:id', eventController.getComcellEventsByGroupId);

// Event creation routes (multiple options for flexibility)
router.post('/createPublicEvent', eventController.createPublicEvent);
router.post('/createComcellEvent', eventController.createComcellEvent);
router.post('/createEvent', eventController.createEvent); // Generic endpoint

// Event management routes
router.put('/updateEvent/:id', eventController.updateEvent);
router.delete('/deleteEvent/:id', eventController.deleteEvent);

// Attendance routes
router.post('/getAttendance', eventController.getAttendance);
router.post('/updateAttendance', eventController.updateAttendance);
router.get('/getAttendanceStats/:groupId', eventController.getAttendanceStats);

module.exports = router;