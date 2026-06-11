const cron = require('node-cron');
const sequelize = require('../config/database');
const { sendEmail } = require('./email.service');
const User = require('../models/user.models');

function startEmailScheduler() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running email jobs...');
    await sendReturnReminders();
    await sendOverdueWarnings();
  });
  console.log('[Scheduler] Email scheduler started');
}

async function sendReturnReminders() {
  const [requests] = await sequelize.query(`
    SELECT br.id, br.request_code, br.return_date, br.student_id,
           u.email
    FROM borrow_requests br
    JOIN users u ON u.id = br.student_id
    WHERE br.status = 'borrowing'
      AND br.return_date = DATE_ADD(CURDATE(), INTERVAL 2 DAY)
      AND br.id NOT IN (
        SELECT borrow_request_id FROM email_logs
        WHERE template_code = 'return_reminder'
          AND DATE(created_at) = CURDATE()
      )
  `);
  for (const req of requests) {
    await sendEmail({
      userId: req.student_id,
      borrowRequestId: req.id,
      templateCode: 'return_reminder',
      toEmail: req.email,
      variables: {
        email: req.email,
        request_code: req.request_code,
        return_date: req.return_date
      }
    });
  }
  console.log(`[Scheduler] Sent ${requests.length} return reminders`);
}

async function sendOverdueWarnings() {
  const [requests] = await sequelize.query(`
    SELECT br.id, br.request_code, br.return_date, br.student_id,
           u.email,
           DATEDIFF(CURDATE(), br.return_date) AS late_days
    FROM borrow_requests br
    JOIN users u ON u.id = br.student_id
    WHERE br.status = 'borrowing'
      AND br.return_date < CURDATE()
      AND br.id NOT IN (
        SELECT borrow_request_id FROM email_logs
        WHERE template_code = 'overdue_warning'
          AND DATE(created_at) = CURDATE()
      )
  `);
  for (const req of requests) {
    await sendEmail({
      userId: req.student_id,
      borrowRequestId: req.id,
      templateCode: 'overdue_warning',
      toEmail: req.email,
      variables: {
        email: req.email,
        request_code: req.request_code,
        late_days: req.late_days
      }
    });
  }
  if (requests.length > 0) {
    const admins = await User.findAll({ where: { role: 'admin' } });
    for (const admin of admins) {
      await sendEmail({
        userId: admin.id,
        borrowRequestId: null,
        templateCode: 'overdue_warning',
        toEmail: admin.email,
        variables: {
          email: admin.email,
          request_code: requests.map(r => r.request_code).join(', '),
          late_days: ''
        }
      });
    }
  }
  console.log(`[Scheduler] Sent ${requests.length} overdue warnings`);
}

module.exports = { startEmailScheduler, sendReturnReminders, sendOverdueWarnings };