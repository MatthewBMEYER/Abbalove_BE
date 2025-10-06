const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');

router.get('/getAllMain', teamController.getAllMainTeams);
router.get('/getAllOther', teamController.getAllOtherTeams);
router.post('/getMembers', teamController.getTeamMembers);
router.post('/getNonMembers', teamController.getAllNonMembers);

router.post('/getAllPositions', teamController.getAllPositions);
router.post('/createPosition', teamController.createPosition);
router.delete('/deletePosition/:id', teamController.deletePosition);

router.post('/getMemberDetail', teamController.getMemberDetail);
router.post('/setMemberDetail', teamController.setMemberDetail);

router.post('/addMemberToTeam', teamController.addMemberToTeam);
router.post('/removeMemberFromTeam', teamController.removeMemberFromTeam);


module.exports = router;