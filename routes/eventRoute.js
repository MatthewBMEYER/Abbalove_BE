const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');

router.get('/getAll', eventController.getAllEvent);
router.get('/getAllEventByGroupId/:id', eventController.getAllEventByGroupId);
router.post('/createEvent', eventController.createEvent);
router.delete('/deleteEvent/:id', eventController.deleteEvent);

router.post('/getAttendance', eventController.getAttendance);
router.post('/updateAttendance', eventController.updateAttendance);

router.get('/getAttendanceStats/:groupId', eventController.getAttendanceStats);

module.exports = router;