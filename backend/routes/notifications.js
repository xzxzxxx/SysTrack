const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const transporter = require('../config/emailConfig');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// This helper function generates the HTML table for the email body
const generateEmailHTML = (contracts) => {
  // These columns match the ones you want in the email
  const columns = [
    { key: 'contract_id', label: 'Contract ID' },
    { key: 'client_code', label: 'Client Code' },
    { key: 'renew_code', label: 'Renew Code' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'end_date', label: 'End Date' },
    { key: 'client_name', label: 'Client' },
    { key: 'alias', label: 'Alias' },
    { key: 'jobnote', label: 'Job Note' },
    { key: 'sales', label: 'Sales' },
    { key: 'contract_name', label: 'Contract Name' },
    { key: 'location', label: 'Location' },
    { key: 'category', label: 'Category' },
    { key: 'contract_status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'project_name', label: 'Project Name' },
  ];

  // Generate the table rows
  let rows = contracts.map(c => `
    <tr>
      ${columns.map(col => {
        let cellData = c[col.key] || '-';
        if ((col.key === 'start_date' || col.key === 'end_date') && c[col.key]) {
          cellData = new Date(c[col.key]).toLocaleDateString();
        }
        return `<td style="border: 1px solid #ddd; padding: 8px;">${cellData}</td>`;
      }).join('')}
    </tr>
  `).join('');

  // Generate the full HTML structure for the email
  return `
    <div style="font-family: sans-serif; font-size: 14px; color: #333;">
      <p>Dear Sales,</p>
      <p>Here is a list of maintenance contracts which will expire in the coming 3 months. Thank you!</p>
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
        <thead style="background-color: #f2f2f2;">
          <tr>
            ${columns.map(col => `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${col.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p>Best regards,</p>
      <p>XXX</p>
    </div>
  `;
};

// POST /api/notifications/send-renewal-email
router.post('/send-renewal-email', async (req, res) => {
  const { contractIds } = req.body;

  if (!contractIds || contractIds.length === 0) {
    return res.status(400).json({ error: 'No contracts selected to notify.' });
  }

  try {
    // 1. Fetch the full details for the selected contracts from the database
    const query = `
      SELECT c.*, cl.client_name, p.project_name
      FROM contracts c
      LEFT JOIN clients cl ON c.client_id = cl.client_id
      LEFT JOIN projects p ON c.project_id = p.project_id
      WHERE c.contract_id = ANY($1::int[])
    `;
    const { rows: contracts } = await pool.query(query, [contractIds]);
    
    if (contracts.length === 0) {
        return res.status(404).json({ error: 'Selected contracts not found.' });
    }

    // Add status to each contract
    contracts.forEach(c => c.contract_status = 'Expiring Soon');

    // 2. Generate the dynamic email subject
    const currentDate = new Date();
    const monthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const subjectLine = `TESTING Maintenance contract reminder (${monthYear})`;

    // 3. Send the email using the configured transporter
    await transporter.sendMail({
      from: `"SysTrack App" <${process.env.EMAIL_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: subjectLine,
      html: generateEmailHTML(contracts),
      });

    res.status(200).json({ message: 'Notification email sent successfully!' });
  } catch (error) {
    console.error('Failed to send email:', error);
    res.status(500).json({ error: 'An error occurred while trying to send the email.' });
  }
});

module.exports = router;