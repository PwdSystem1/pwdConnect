const express = require('express');
const {staffLogin} = require('../controllers/staffloginController.js');

const router = express.Router();

// Staff Login Route
router.post('/', staffLogin);

module.exports = router;