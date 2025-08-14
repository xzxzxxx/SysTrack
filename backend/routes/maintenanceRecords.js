const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const verifyToken = require('../middleware/auth'); // Assuming your token verification middleware is here
const checkRole = require('../middleware/checkRole'); // Import our new role check middleware

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Protect all routes in this file. Only users with 'admin' or 'AE' roles can access them.
router.use(verifyToken);
router.use(checkRole(['admin', 'AE']));

// --- API Endpoints ---

/**
 * POST /api/maintenance-records
 * Create a new maintenance record. This is a transactional operation.
 * It first creates the main record, then associates the PICs (Person In Charge) in the junction table.
 */
router.get('/', async (req, res) => {
    const {
        service_date,
        service_code,
        client_id,
        job_note,
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

    // Start a client connection from the pool to manage the transaction.
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
    
        // Step 1: Insert the main record into the maintenance_records table.
        // The initial status is always 'New' as per our workflow.
        const newRecordQuery = `
          INSERT INTO maintenance_records (
            service_date, service_code, client_id, job_note, location_district,
            is_warranty, sales_text, product_model, serial_no, problem_description,
            service_type, product_type, support_method, symptom_classification, alias,
            user_id, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          RETURNING *;
        `;
        const newRecord = await client.query(newRecordQuery, [
          service_date, service_code, client_id, job_note, location_district,
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

// POST /api/maintenance-records - Create a new maintenance record
router.post('/', async (req, res) => {
    const {
        page = 1,
        limit = 10,
        statuses,
        // --- Individual search fields ---
        service_code,
        client_name,
        job_note,
        location_district,
        ae_name, // This will search based on the PICs assigned
        // --- Sorting fields ---
        sort_by_1, sort_dir_1 = 'asc',
        sort_by_2, sort_dir_2 = 'asc'
      } = req.query;
    
      const offset = (page - 1) * limit;
      
      let baseQuery = `
        FROM maintenance_records mr
        LEFT JOIN clients c ON mr.client_id = c.client_id
        LEFT JOIN users u_creator ON mr.user_id = u_creator.user_id
        -- We will add a join for PICs later to enable searching by 'ae_name'
      `;
    
      let whereClauses = [];
      let queryParams = [];
      let paramIndex = 1;
    
      // Build WHERE clauses for each search filter
      if (statuses) {
        whereClauses.push(`mr.status = ANY($${paramIndex++}::text[])`);
        queryParams.push(statuses.split(','));
      }
      if (service_code) {
        whereClauses.push(`mr.service_code ILIKE $${paramIndex++}`);
        queryParams.push(`%${service_code}%`);
      }
      if (client_name) {
        whereClauses.push(`c.client_name ILIKE $${paramIndex++}`);
        queryParams.push(`%${client_name}%`);
      }
      if (job_note) {
        whereClauses.push(`mr.job_note ILIKE $${paramIndex++}`);
        queryParams.push(`%${job_note}%`);
      }
      // Add other search fields here...
    
      const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    
      // Build ORDER BY clause
      let orderByClauses = [];
      if (sort_by_1) orderByClauses.push(`"${sort_by_1}" ${sort_dir_1.toUpperCase()}`);
      if (sort_by_2) orderByClauses.push(`"${sort_by_2}" ${sort_dir_2.toUpperCase()}`);
      const orderByString = orderByClauses.length > 0 ? `ORDER BY ${orderByClauses.join(', ')}` : 'ORDER BY mr.maintenance_id DESC';
    
      try {
        // --- Query to get the total count of matching records ---
        const countQuery = `SELECT COUNT(DISTINCT mr.maintenance_id) ${baseQuery} ${whereString}`;
        const totalResult = await pool.query(countQuery, queryParams);
        const total = parseInt(totalResult.rows[0].count, 10);
    
        // --- Query to get the paginated data ---
        const dataQuery = `
          SELECT 
            mr.*, 
            c.client_name, 
            u_creator.username as creator_username
            -- We will also select a list of PIC names here later
          ${baseQuery}
          ${whereString}
          GROUP BY mr.maintenance_id, c.client_name, u_creator.username
          ${orderByString}
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        const dataResult = await pool.query(dataQuery, [...queryParams, limit, offset]);
    
        res.json({
          data: dataResult.rows,
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10)
        });
    
      } catch (err) {
        console.error(err.stack);
        res.status(500).json({ error: 'Server error while fetching maintenance records.' });
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
    const { pic_ids, ...fieldsToUpdate } = req.body;
  
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
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;
  
    try {
      // Step 1: Fetch the record to find out who created it.
      const recordResult = await pool.query('SELECT user_id FROM maintenance_records WHERE maintenance_id = $1', [id]);
  
      if (recordResult.rows.length === 0) {
        return res.status(404).json({ error: 'Record not found.' });
      }
      
      const creatorUserId = recordResult.rows[0].user_id;
  
      // Step 2: Check permissions. User must be an admin OR the original creator.
      if (requestingUserRole !== 'admin' && requestingUserId !== creatorUserId) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this record.' });
      }
      
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