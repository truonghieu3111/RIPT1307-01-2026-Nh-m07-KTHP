const { Router } = require('express');
const { getBorrowStatsByMonth, getOverdueRequests } = require('../controllers/statistics.controller');
const { authenticateJWT, authorizeRole } = require('../middleware/auth.middleware');

const router = Router();

// GET /api/statistics/time/monthly?year=2026
router.get('/time/monthly', authenticateJWT, authorizeRole('admin'), getBorrowStatsByMonth);

// GET /api/statistics/time/overdue?page=1&limit=20
router.get('/time/overdue', authenticateJWT, authorizeRole('admin'), getOverdueRequests);

module.exports = router;