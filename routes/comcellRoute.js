const express = require('express');
const router = express.Router();
const comcellController = require('../controllers/comcellController');

router.post('/createComcellGroup', comcellController.createComcellGroup);
router.delete('/deleteComcellGroup/:id', comcellController.deleteComcellGroup);
router.post('/updateComcellGroup/:id', comcellController.updateComcellGroup);

router.get('/getAll', comcellController.getAllComcell);
router.get('/getAllAdult', comcellController.getAllAdultComcell);
router.get('/getAllYouth', comcellController.getAllYouthComcell);

router.get('/getComcellGroupMembers/:id', comcellController.getComcellGroupMembers);
router.get('/getComcellFromUserId/:userId', comcellController.getComcellFromUserId);
router.post('/getMemberDetail', comcellController.getMemberDetail);
router.post('/setMemberDetail', comcellController.setMemberDetail);
router.post('/addMemberToComcellGroup', comcellController.addMemberToComcellGroup);
router.post('/removeMemberFromComcellGroup', comcellController.removeMemberFromComcellGroup);

router.get('/getComcellGroupDetail/:id', comcellController.getComcellGroupDetail);


module.exports = router;
