const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const verifyToken = require('../middleware/auth');
//const checkRole = require('../middleware/checkRole');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Protect all routes in this file. Only users with 'admin' or 'AE' roles can access them.
router.use(verifyToken);
//router.use(checkRole(['admin', 'AE']));

const parseStatuses = (raw) =>
  String(raw || '')
    .split(',')
    .map((s) => s.replace(/\+/g, ' ').trim())
    .filter(Boolean);

// Validate minimal fields for creation
const validateCoreForNew = (body) => {
  const errors = [];
  if (!body.client_id) errors.push('client_id is required');
  if (!body.jobnote) errors.push('jobnote is required');
  if (!body.service_code) errors.push('service_code is required');
  return errors;
};

// Validate required fields for target status
const validateForStatus = (targetStatus, body) => {
  const errors = [];
  switch (targetStatus) {
    case 'New':
      // only core required
      break;
    case 'Pending': {
      const ids = Array.isArray(body.pic_ids) ? body.pic_ids : [];
      if (ids.length < 1) errors.push('pic_ids (array) with at least 1 PIC is required for Pending');
      break;
    }
    case 'In Progress':
      if (!body.service_date) errors.push('service_date is required for In Progress');
      break;
    case 'Follow-up required':
      // same as 'New' - only core fields required (client_id, jobnote, service_code)
      // no need for completion_date or solution_details
      break;
    case 'Closed':
      if (!body.completion_date) errors.push('completion_date is required for Closed');
      if (!body.solution_details) errors.push('solution_details is required for Closed');
      break;
    default:
      errors.push('Invalid status value');
  }
  return errors;
};


// Time validation for arrive and depaetrt time (HH:MM or HH:MM:SS)
const toPgTimeOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(s)) return null; // HH:MM or HH:MM:SS
  return s;
};
const toMin = (s) => {
  if (!s || !/^\d{2}:\d{2}/.test(s)) return null;
  const [h, m] = s.split(':').slice(0, 2).map(Number);
  return h * 60 + m;
};

/**
 * POST /api/maintenance-records
 * Create a new maintenance record. This is a transactional operation.
 * It first creates the main record, then associates the PICs (Person In Charge) in the junction table.
 */
router.post('/', async (req, res) => {
    const {
        service_date,
        service_code,
        client_id,
        jobnote,
        location_district,
        is_warranty,
        sales,
        product_model,
        serial_no,
        problem_description,
        solution_details,
        labor_details,
        parts_details,
        arrive_time,
        depart_time,
        completion_date,
        remark,
        service_type,
        product_type,
        support_method,
        symptom_classification,
        alias,
        pic_ids = [] // Expect an array of user IDs for the PICs
    } = req.body;

    // Validate core fields for 'New'
    const coreErrs = validateCoreForNew({ client_id, jobnote, service_code });
    if (coreErrs.length) {
      return res.status(400).json({ error: coreErrs.join('; ') });
    }
    
    // Validate jobnote exists in contracts
    try {
      const contractCheck = await pool.query('SELECT 1 FROM contracts WHERE jobnote = $1', [jobnote]);
      if (contractCheck.rows.length === 0) {
        return res.status(400).json({ error: `Jobnote "${jobnote}" not found in any existing contract.` });
      }
    } catch (e) {
      return res.status(500).json({ error: 'Error validating Job Note.' });
    }

    // Validate arrive_time <= depart_time if both provided
    const aMin = toMin(toPgTimeOrNull(arrive_time));
    const dMin = toMin(toPgTimeOrNull(depart_time));
    if (aMin != null && dMin != null && aMin > dMin) {
      return res.status(400).json({ error: 'arrive_time must be <= depart_time' });
    }

    // The user_id of the creator comes from the token, not the request body.
    const creatorUserId = req.user.user_id || req.user.userId;
    // Start a client connection from the pool to manage the transaction.
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
    
        // Step 1: Insert the main record into the maintenance_records table.
        // The initial status is always 'New' as per our workflow.
        const insertSQL = `
      INSERT INTO maintenance_records (
        service_date, service_code, client_id, jobnote, location_district,
        is_warranty, sales, product_model, serial_no, problem_description,
        solution_details, labor_details, parts_details, arrive_time, depart_time,
        completion_date, remark, service_type, product_type, support_method,
        symptom_classification, alias, user_id, status
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,
        $21,$22,$23,'New'
      )
      RETURNING *;
    `;
    const vals = [
      service_date || null,
      service_code,
      client_id,
      jobnote,
      location_district || null,
      is_warranty ?? null,
      sales || null,
      product_model || null,
      serial_no || null,
      problem_description || null,
      solution_details || null,
      labor_details || null,
      parts_details || null,
      toPgTimeOrNull(arrive_time),
      toPgTimeOrNull(depart_time),
      completion_date || null,
      remark || null,
      service_type || null,
      product_type || null,
      support_method || null,
      symptom_classification || null,
      alias || null,
      creatorUserId,
    ];

    const inserted = await client.query(insertSQL, vals);
    const rec = inserted.rows[0];

    // Insert PICs if provided (safe even when empty)
    if (Array.isArray(pic_ids) && pic_ids.length > 0) {
      await client.query(
        'INSERT INTO maintenance_request_pics (maintenance_request_id, pic_user_id) SELECT $1, unnest($2::int[])',
        [rec.maintenance_id, pic_ids]
      );
    }

    await client.query('COMMIT');

    // Return with aggregated PICs
    const out = await pool.query(
      `
      SELECT
        mr.*,
        (SELECT json_agg(jsonb_build_object('user_id', u_pic.user_id, 'username', u_pic.username))
         FROM maintenance_request_pics mrp
         JOIN users u_pic ON mrp.pic_user_id = u_pic.user_id
         WHERE mrp.maintenance_request_id = mr.maintenance_id) AS pics
      FROM maintenance_records mr
      WHERE mr.maintenance_id = $1
      `,
      [rec.maintenance_id]
    );

    return res.status(201).json(out.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.stack);
    return res.status(500).json({ error: 'Server error while creating maintenance record.' });
  } finally {
    client.release();
  }
});

// GET /api/maintenance-records - List with filters, pagination, sorting, PICs aggregated
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 50,
    statuses,
    service_code,
    client_name,
    jobnote,
    location_district,
    ae_name,
    sort_by_1,
    sort_dir_1 = 'desc',
    sort_by_2,
    sort_dir_2 = 'asc',
  } = req.query;

  const offset = (Number(page) - 1) * Number(limit);
  let baseQuery = `
    FROM maintenance_records mr
    LEFT JOIN clients c ON mr.client_id = c.client_id
    LEFT JOIN users u_creator ON mr.user_id = u_creator.user_id
  `;

  const whereClauses = [];
  const params = [];
  let i = 1;

  // B) decode '+' to space for statuses values
  if (statuses) {
    const arr = parseStatuses(statuses);
    if (arr.length) {
      whereClauses.push(`mr.status = ANY($${i++}::text[])`);
      params.push(arr);
    }
  }

  if (service_code) {
    whereClauses.push(`mr.service_code ILIKE $${i++}`);
    params.push(`%${service_code}%`);
  }
  if (client_name) {
    whereClauses.push(`c.client_name ILIKE $${i++}`);
    params.push(`%${client_name}%`);
  }
  if (jobnote) {
    whereClauses.push(`mr.jobnote ILIKE $${i++}`);
    params.push(`%${jobnote}%`);
  }
  if (location_district) {
    whereClauses.push(`mr.location_district ILIKE $${i++}`);
    params.push(`%${location_district}%`);
  }

  if (ae_name) {
    whereClauses.push(`
      mr.maintenance_id IN (
        SELECT mrp.maintenance_request_id
        FROM maintenance_request_pics mrp
        JOIN users u_pic ON mrp.pic_user_id = u_pic.user_id
        WHERE u_pic.username ILIKE $${i++}
      )
    `);
    params.push(`%${ae_name}%`);
  }

  const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // simple order whitelist
  const safeKey = (k) => {
    const allow = new Set([
      'maintenance_id',
      'status',
      'service_date',
      'created_at',
      'updated_at',
    ]);
    return allow.has(k) ? `"${k}"` : '"maintenance_id"';
  };
  const orderBy = [];
  if (sort_by_1) orderBy.push(`${safeKey(sort_by_1)} ${String(sort_dir_1).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`);
  if (sort_by_2) orderBy.push(`${safeKey(sort_by_2)} ${String(sort_dir_2).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`);
  const orderSQL = orderBy.length ? `ORDER BY ${orderBy.join(', ')}` : 'ORDER BY mr.maintenance_id DESC';

  try {
    const countSQL = `SELECT COUNT(DISTINCT mr.maintenance_id) AS total_count ${baseQuery} ${whereSQL}`;
    const countRes = await pool.query(countSQL, params);
    const total = parseInt(countRes.rows[0]?.total_count || '0', 10);

    const dataSQL = `
      SELECT
        mr.*,
        c.client_name,
        u_creator.username AS creator_username,
        (
          SELECT json_agg(jsonb_build_object('user_id', u_pic.user_id, 'username', u_pic.username))
          FROM maintenance_request_pics mrp
          JOIN users u_pic ON mrp.pic_user_id = u_pic.user_id
          WHERE mrp.maintenance_request_id = mr.maintenance_id
        ) AS pics
      ${baseQuery}
      ${whereSQL}
      ${orderSQL}
      LIMIT $${i++} OFFSET $${i++}
    `;
    const dataRes = await pool.query(dataSQL, [...params, Number(limit), Number(offset)]);
    return res.json({ data: dataRes.rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('maintenance GET / error:', err);
    return res.status(500).json({ error: 'Server error while fetching maintenance records.' });
  }
});

// GET /api/maintenance-records/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT
        mr.*,
        c.client_name,
        u.username AS creator_username,
        (
          SELECT json_agg(jsonb_build_object('user_id', u_pic.user_id, 'username', u_pic.username))
          FROM maintenance_request_pics mrp
          JOIN users u_pic ON mrp.pic_user_id = u_pic.user_id
          WHERE mrp.maintenance_request_id = mr.maintenance_id
        ) AS pics
      FROM maintenance_records mr
      LEFT JOIN clients c ON mr.client_id = c.client_id
      LEFT JOIN users u ON mr.user_id = u.user_id
      WHERE mr.maintenance_id = $1
      GROUP BY mr.maintenance_id, c.client_name, u.username;
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err.stack);
    return res.status(500).json({ error: 'Server error while fetching maintenance record.' });
  }
});
  
// PUT /api/maintenance-records/:id - Update record with status transition and PICs management
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { pic_ids, status, jobnote, ...rawFields } = req.body;

  // Define allowed fields in maintenance_records table (exclude computed/JOIN fields like creator_username, client_name)
  // Based on maintenance_records schema: exclude 'client', 'created_at', 'updated_at' (auto), 'user_id' (immutable)
  const allowedFields = [
    'service_date', 'service_code', 'client_id', 'jobnote', 'location_district',
    'is_warranty', 'sales', 'product_model', 'serial_no', 'problem_description',
    'solution_details', 'labor_details', 'parts_details', 'arrive_time', 'depart_time',
    'completion_date', 'remark', 'service_type', 'product_type', 'support_method',
    'symptom_classification', 'alias', 'status'  // Use 'status' (or 'maintenance_status' if preferred)
  ];

  const dateTimeFields = ['service_date', 'arrive_time', 'depart_time', 'completion_date'];

  // Filter only allowed fields from raw input (ignores creator_username, client_name, pic_ids_input, pics, client, etc.)
  // Convert empty strings to null for date/time fields to prevent PostgreSQL invalid input error
  const fieldsToUpdate = {};
  Object.entries(rawFields).forEach(([key, value]) => {
    if (!allowedFields.includes(key)) return;

    if (key === 'arrive_time' || key === 'depart_time') {
      fieldsToUpdate[key] = toPgTimeOrNull(value); // HH:MM or null
      return;
    }

    if (dateTimeFields.includes(key) && value === '') {
      fieldsToUpdate[key] = null;  // Convert empty string to null for date/time fields
    } else {
      fieldsToUpdate[key] = value;
    }
  });

  // Get current user id
  const modifierUserId = req.user.user_id || req.user.userId;
  fieldsToUpdate.user_id = modifierUserId;

  // Validate arrive_time <= depart_time if both provided
  const aVal = (Object.prototype.hasOwnProperty.call(fieldsToUpdate, 'arrive_time')
    ? fieldsToUpdate.arrive_time
    : toPgTimeOrNull(req.body.arrive_time));
  const dVal = (Object.prototype.hasOwnProperty.call(fieldsToUpdate, 'depart_time')
    ? fieldsToUpdate.depart_time
    : toPgTimeOrNull(req.body.depart_time));

  const aMin = toMin(aVal);
  const dMin = toMin(dVal);
  if (aMin != null && dMin != null && aMin > dMin) {
    return res.status(400).json({ error: 'arrive_time must be <= depart_time' });
  }

  // Validate jobnote if provided (must exist in contracts table)
  let validatedJobnote = jobnote;
  if (jobnote) {
    try {
      const contractCheck = await pool.query('SELECT 1 FROM contracts WHERE jobnote = $1', [jobnote]);
      if (contractCheck.rows.length === 0) {
        return res.status(400).json({ error: `Invalid Job Note: No contract found with Job Note "${jobnote}".` });
      }
      validatedJobnote = jobnote;
      fieldsToUpdate.jobnote = jobnote;  // Add to update if valid
    } catch (err) {
      console.error('Jobnote validation error:', err);
      return res.status(500).json({ error: 'Error validating Job Note.' });
    }
  }

  // Validate target status and required fields (same as POST logic)
  if (status) {
    const validationBody = { ...fieldsToUpdate, pic_ids };  // Include pic_ids for Pending check
    const errs = validateForStatus(status, validationBody);
    if (errs.length) {
      return res.status(400).json({ error: errs.join('; ') });
    }
    fieldsToUpdate.status = status;  // Safe to update status
  }

  // Start transaction for atomic updates
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update main record (only if there are allowed fields to update)
    if (Object.keys(fieldsToUpdate).length > 0) {
      const entries = Object.entries(fieldsToUpdate);
      const setClause = entries.map(([key], idx) => `"${key}" = $${idx + 1}`).join(', ');
      const values = entries.map(([, value]) => value);
      const updateSQL = `
        UPDATE maintenance_records
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE maintenance_id = $${values.length + 1}
      `;
      await client.query(updateSQL, [...values, id]);
    }

    // Handle PICs separately: delete existing, insert new (if provided)
    if (Array.isArray(pic_ids)) {
      // Delete old associations
      await client.query('DELETE FROM maintenance_request_pics WHERE maintenance_request_id = $1', [id]);
      // Insert new ones if array is not empty
      if (pic_ids.length > 0) {
        await client.query(
          'INSERT INTO maintenance_request_pics (maintenance_request_id, pic_user_id) SELECT $1, unnest($2::int[])',
          [id, pic_ids]
        );
      }
    }

    await client.query('COMMIT');
    return res.json({ message: 'Record updated successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Update transaction error:', err.stack);
    return res.status(500).json({ error: 'Server error while updating maintenance record.' });
  } finally {
    client.release();
  }
});

  
// DELETE /api/maintenance-records/:id
// DELETE /maintenance-records/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // delete m2m relations first to avoid FK violation
    await client.query(
      'DELETE FROM maintenance_request_pics WHERE maintenance_request_id = $1',
      [id]
    );

    const del = await client.query(
      'DELETE FROM maintenance_records WHERE maintenance_id = $1 RETURNING maintenance_id',
      [id]
    );

    await client.query('COMMIT');

    if (del.rowCount === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    return res.status(200).json({ success: true, maintenance_id: del.rows[0].maintenance_id });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    return res.status(500).json({ error: 'Failed to delete maintenance record' });
  } finally {
    client.release();
  }
});

module.exports = router;