const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/getAll', userController.getAllUsers);
router.get('/getDetail/:id', userController.getUserDetails);

router.post('/profile/edit', userController.editProfile);
router.post('/setRole/:id', userController.setRole);
router.post('/setStatus/:id', userController.setStatus);

module.exports = router;