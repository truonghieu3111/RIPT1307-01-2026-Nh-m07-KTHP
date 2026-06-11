const statisticsService = require('../services/statistics.service');

async function getBorrowStatsByMonth(req, res) {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const result = await statisticsService.getBorrowStatsByMonth(year);
    res.json(result);
  } catch (error) {
    console.error('getBorrowStatsByMonth error:', error.message);
    res.status(500).json({ message: 'Failed to load statistics' });
  }
}

async function getOverdueRequests(req, res) {
  try {
    const { page, limit } = req.query;
    const result = await statisticsService.getOverdueRequests({ page, limit });
    res.json(result);
  } catch (error) {
    console.error('getOverdueRequests error:', error.message);
    res.status(500).json({ message: 'Failed to load overdue requests' });
  }
}

module.exports = { getBorrowStatsByMonth, getOverdueRequests };