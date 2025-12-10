const express = require('express');
const router = express.Router();
const eventController = require('../controllers/coreEventController');

// Event routes
router.post('/create', eventController.createEvent);

router.get('/getAllEventAdmin', eventController.getAllEventAdmin);
router.get('/getAllPostEventAdmin', eventController.getAllPostEventAdmin);

router.get('/getAllEventPublic', eventController.getAllEventPublic);
router.get('/getAllPostEventPublic', eventController.getAllPostEventPublic);

router.get('/get/:id', eventController.getEventById);
router.put('/update/:id', eventController.updateEvent);
router.delete('/delete/:id', eventController.deleteEvent);

module.exports = router;