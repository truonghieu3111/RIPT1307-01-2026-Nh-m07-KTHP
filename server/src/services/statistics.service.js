const sequelize = require('../config/database');

// Thống kê 12 tháng gần nhất
async function getBorrowStatsByMonth(year) {
  const targetYear = year || new Date().getFullYear();

  const [rows] = await sequelize.query(`
    SELECT 
      MONTH(created_at) AS month,
      COUNT(*) AS total_requests,
      SUM(CASE WHEN status IN ('returned_ontime', 'returned_late', 'borrowing') THEN 1 ELSE 0 END) AS total_borrowed,
      SUM(CASE WHEN status = 'returned_late' THEN 1 ELSE 0 END) AS total_late,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS total_rejected
    FROM borrow_requests
    WHERE YEAR(created_at) = :year
    GROUP BY MONTH(created_at)
    ORDER BY month ASC
  `, { replacements: { year: targetYear } });

  // Đảm bảo đủ 12 tháng, tháng không có data thì để 0
  const months = Array.from({ length: 12 }, (_, i) => {
    const found = rows.find(r => Number(r.month) === i + 1);
    return {
      month: i + 1,
      total_requests: found ? Number(found.total_requests) : 0,
      total_borrowed: found ? Number(found.total_borrowed) : 0,
      total_late: found ? Number(found.total_late) : 0,
      total_rejected: found ? Number(found.total_rejected) : 0
    };
  });

  // Tìm tháng cao nhất và thấp nhất theo total_borrowed
  const nonZero = months.filter(m => m.total_borrowed > 0);
  const highest = nonZero.length
    ? nonZero.reduce((a, b) => (a.total_borrowed >= b.total_borrowed ? a : b))
    : null;
  const lowest = nonZero.length
    ? nonZero.reduce((a, b) => (a.total_borrowed <= b.total_borrowed ? a : b))
    : null;

  return {
    year: targetYear,
    months,
    summary: {
      total_requests: months.reduce((s, m) => s + m.total_requests, 0),
      total_borrowed: months.reduce((s, m) => s + m.total_borrowed, 0),
      total_late: months.reduce((s, m) => s + m.total_late, 0),
      highest_month: highest ? { month: highest.month, count: highest.total_borrowed } : null,
      lowest_month: lowest ? { month: lowest.month, count: lowest.total_borrowed } : null
    }
  };
}

// Lấy danh sách đơn quá hạn (dùng lại cho bảng Dashboard)
async function getOverdueRequests({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const [rows] = await sequelize.query(`
    SELECT 
      br.id,
      br.request_code,
      br.return_date,
      br.status,
      DATEDIFF(CURDATE(), br.return_date) AS late_days,
      s.full_name AS student_name,
      s.student_code,
      e.name AS equipment_name,
      e.code AS equipment_code
    FROM borrow_requests br
    JOIN students s ON s.id = br.student_id
    JOIN equipment e ON e.id = br.equipment_id
    WHERE br.status = 'borrowing'
      AND br.return_date < CURDATE()
    ORDER BY late_days DESC
    LIMIT :limit OFFSET :offset
  `, { replacements: { limit: Number(limit), offset: Number(offset) } });

  const [[{ total }]] = await sequelize.query(`
    SELECT COUNT(*) AS total
    FROM borrow_requests
    WHERE status = 'borrowing' AND return_date < CURDATE()
  `);

  return {
    total: Number(total),
    page: Number(page),
    totalPages: Math.ceil(Number(total) / limit),
    data: rows
  };
}

module.exports = { getBorrowStatsByMonth, getOverdueRequests };