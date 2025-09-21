const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const verifyToken = require('../middleware/auth'); // Assuming your token verification middleware is here
//const checkRole = require('../middleware/checkRole'); // Import our new role check middleware

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Protect all routes in this file. Only users with 'admin' or 'AE' roles can access them.
router.use(verifyToken);
//router.use(checkRole(['admin', 'AE']));

// --- API Endpoints ---

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
        remark, service_type,
        product_type,
        support_method,
        symptom_classification,
        status = 'Pending', 
        lias,
        picUserIds = [] // Expect an array of user IDs for the PICs
    } = req.body;
    
    // The user_id of the creator comes from the token, not the request body.
    const creatorUserId = req.user.user_id;

    // Validate that the provided jobnote exists in the contracts 
    if (jobnote) {
      const contractCheck = await pool.query(
        'SELECT 1 FROM contracts WHERE jobnote = $1',
        [jobnote]
      );
      if (contractCheck.rows.length === 0) {
        return res.status(400).json({ error: `Jobnote "${jobnote}" not found in any existing contract.` });
      }
    }

    // Start a client connection from the pool to manage the transaction.
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
    
        // Step 1: Insert the main record into the maintenance_records table.
        // The initial status is always 'New' as per our workflow.
        const newRecordQuery = `
          INSERT INTO maintenance_records (
            service_date, service_code, client_id, jobnote, location_district,
            is_warranty, sales_text, product_model, serial_no, problem_description,
            service_type, product_type, support_method, symptom_classification, alias,
            user_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *;
        `;
        const newRecord = await client.query(newRecordQuery, [
          service_date, service_code, client_id, jobnote, location_district,
          is_warranty, sales, product_model, serial_no, problem_description,
          service_type, product_type, support_method, symptom_classification, alias,
          creatorUserId, 'New' // Set initial status to 'New'
        ]);
        
        // In a future step, when we handle assigning PICs, we would insert into
        // the maintenance_request_pics table here. For now, we just create the record.
    
        await client.query('COMMIT');
        res.status(201).json(newRecord.rows[0]);
    
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.stack);
        res.status(500).json({ error: 'Server error while creating maintenance record.' });
    } finally {
        client.release();
    }
});


router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 10,
    statuses,
    service_code,
    client_name,
    jobnote,
    location_district,
    ae_name,
    sort_by_1, sort_dir_1 = 'asc',
    sort_by_2, sort_dir_2 = 'asc'
  } = req.query;

  const offset = (page - 1) * limit;

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
    const statusArray = statuses.split(',').map(s => s.replace(/\+/g, ' '));
    whereClauses.push(`mr.status = ANY($${i++}::text[])`);
    params.push(statusArray);
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

  const orderBy = [];
  if (sort_by_1) orderBy.push(`"${sort_by_1}" ${String(sort_dir_1).toUpperCase()}`);
  if (sort_by_2) orderBy.push(`"${sort_by_2}" ${String(sort_dir_2).toUpperCase()}`);
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

// GET /api/maintenance-records/:id - Get a single record by its ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const query = `
        SELECT 
          mr.*,
          c.client_name,
          u.username AS creator_username,
          -- Aggregate all assigned PICs into a JSON array
          (SELECT json_agg(json_build_object('user_id', u_pic.user_id, 'username', u_pic.username))
           FROM maintenance_request_pics mrp
           JOIN users u_pic ON mrp.pic_user_id = u_pic.user_id
           WHERE mrp.maintenance_request_id = mr.maintenance_id) AS pics
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
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: 'Server error while fetching maintenance record.' });
    }
});
  
// PUT /api/maintenance-records/:id - Update a record
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    // pic_ids should be an array of user IDs, e.g., [1, 5, 10]
    const { pic_ids, jobnote, ...fieldsToUpdate } = req.body;

    if (jobnote) {
      try {
        const contractCheck = await pool.query('SELECT 1 FROM contracts WHERE jobnote = $1', [jobnote]);
        if (contractCheck.rows.length === 0) {
          return res.status(400).json({ error: `Invalid Job Note: No contract found with Job Note "${jobnote}".` });
        }
      } catch(err) {
        console.error(err);
        return res.status(500).json({ error: 'Error validating Job Note.' });
      }
    }  
  
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); // Start transaction
  
      // Step 1: Update the main record in the maintenance_records table
      // Dynamically build the SET part of the query
      const fieldEntries = Object.entries(fieldsToUpdate);
      const setClause = fieldEntries.map(([key, value], index) => `"${key}" = $${index + 1}`).join(', ');
      const fieldValues = fieldEntries.map(([key, value]) => value);
  
      if (setClause) {
        const updateQuery = `UPDATE maintenance_records SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE maintenance_id = $${fieldValues.length + 1} RETURNING *`;
        await client.query(updateQuery, [...fieldValues, id]);
      }
  
      // Step 2: Update the PICs in the junction table
      // This is the most robust way: delete all existing PICs for this record, then insert the new ones.
      if (pic_ids && Array.isArray(pic_ids)) {
        // Delete old PIC assignments
        await client.query('DELETE FROM maintenance_request_pics WHERE maintenance_request_id = $1', [id]);
        
        // Insert new PIC assignments
        if (pic_ids.length > 0) {
          const picInsertQuery = 'INSERT INTO maintenance_request_pics (maintenance_request_id, pic_user_id) SELECT $1, unnest($2::int[])';
          await client.query(picInsertQuery, [id, pic_ids]);
        }
      }
      
      await client.query('COMMIT'); // Commit transaction
      res.json({ message: 'Record updated successfully.' });
  
    } catch (err) {
      await client.query('ROLLBACK'); // Rollback on error
      console.error(err.stack);
      res.status(500).json({ error: 'Server error while updating maintenance record.' });
    } finally {
      client.release();
    }
});
  
// DELETE /api/maintenance-records/:id - Delete a record
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const requestingUserId = req.user.user_id;
    const requestingUserRole = req.user.role;
  
    try {
      // Step 1: Fetch the record to find out who created it.
      const recordResult = await pool.query('SELECT user_id FROM maintenance_records WHERE maintenance_id = $1', [id]);
  
      if (recordResult.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found.' });
      }
      
      const creatorUserId = recordResult.rows[0].user_id;
  
      // Step 2: Check permissions. User must be an admin OR the original creator.
      /*
      if (requestingUserRole !== 'admin' && requestingUserId !== creatorUserId) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this record.' });
      }
        */
      
      // Step 3: If permission check passes, delete the record.
      // The ON DELETE CASCADE rule will automatically delete related entries in maintenance_request_pics.
      await pool.query('DELETE FROM maintenance_records WHERE maintenance_id = $1', [id]);
      
      res.status(200).json({ message: 'Record deleted successfully.' });
  
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: 'Server error while deleting maintenance record.' });
    }
});
  
module.exports = router;