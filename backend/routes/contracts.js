const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Mapping for category to two-letter code
const categoryMap = {
  SVR: 'MS',
  DSS: 'MD',
  EMB: 'ME'
};

// Generate contract code (e.g., MS25A0103)
// Format: mapped_category(2letter)YYdedicated_numberno_of_orders
const generateContractCode = async (category, client_id) => {
  // Validate category
  if (!categoryMap[category]) {
    throw new Error('Invalid category. Must be SVR, DSS, or EMB.');
  }
  
  const mappedCategory = categoryMap[category]; // e.g., SVR -> MS
  const year = new Date().getFullYear().toString().slice(-2); // Last two digits of year, e.g., "25"
  
  // Fetch dedicated_number from Clients table
  const clientResult = await pool.query(
    'SELECT dedicated_number FROM Clients WHERE client_id = $1',
    [client_id]
  );
  if (clientResult.rows.length === 0) {
    throw new Error('Client not found');
  }
  const dedicated_number = clientResult.rows[0].dedicated_number;
  
  // Count existing contracts for the client (including current one)
  const contractResult = await pool.query(
    'SELECT COUNT(*) FROM Contracts WHERE client_id = $1',
    [client_id]
  );
  const no_of_orders = (contractResult.rows[0] ? parseInt(contractResult.rows[0].count, 10) : 0) + 1; // Add 1 for current contract
  
  // Generate code
  const client_code = `${mappedCategory}${year}${dedicated_number}${String(no_of_orders).padStart(2, '0')}`;
  
  // Check for duplicate code
  const duplicateCheck = await pool.query(
    'SELECT 1 FROM Contracts WHERE client_code = $1',
    [client_code]
  );
  if (duplicateCheck.rows.length > 0) {
    console.warn(`Duplicate client_code detected: ${client_code}. Setting to null.`);
    return null;
  }
  
  return client_code;
};

// Calculate contract status based on start_date and end_date
const calculateContractStatus = (start_date, end_date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to the beginning of the day
  const start = new Date(start_date);
  const end = new Date(end_date);
  const threeMonthsFromNow = new Date();
  threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

  if (today < start) {
    return 'Pending';
  } else if (today > end) {
    return 'Expired';
  } else if (end <= threeMonthsFromNow) {
    return 'Expiring Soon';
  } else {
    return 'Active';
  }
};

// Date Validation Helper Function ---
const validateContractDates = (start_date, end_date) => {
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const currentYear = new Date().getFullYear();

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 'Invalid date format provided.';
  }
  if (startDate.getFullYear() < currentYear - 100 || startDate.getFullYear() > currentYear + 100) {
    return 'Start date year is out of the acceptable range.';
  }
  if (endDate <= startDate) {
    return 'End date must be after the start date.';
  }
  return null; // No errors
};

// Whitelist of allowed column keys and their corresponding DB columns
const allowedSortColumns = {
  'contract_id': 'c.contract_id',
  'start_date': 'c.start_date',
  'end_date': 'c.end_date',
  'created_at': 'c.created_at',
  'contract_name': 'c.contract_name',
  'client_name': 'cl.client_name',
  'username': 'u.username',
  'project_name': 'p.project_name',
  'location': 'c.location',
  'category': 'c.category'
};

// Get all contracts with search and pagination
// GET all contracts with enhanced search, filtering, and pagination
router.get('/', async (req, res) => {
  try{
    // Destructure all possible query parameters
    const { search, page = 1, limit = 50, project_id, statuses, jobnote } = req.query;
    const offset = (page - 1) * limit;

    // Base query with all necessary joins
    let baseQuery = `
      FROM Contracts c
      LEFT JOIN projects p ON c.project_id = p.project_id
      LEFT JOIN clients cl ON c.client_id = cl.client_id
      LEFT JOIN Users u ON c.user_id = u.user_id
    `;

    // Use parameterized queries to prevent SQL injection
    const values = [];
    const conditions = [];

    // --- Dynamically build WHERE conditions ---

    // 1. Handle search term
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(
        c.contract_name ILIKE $${values.length} OR
        cl.client_name ILIKE $${values.length} OR
        c.jobnote ILIKE $${values.length} OR
        u.username ILIKE $${values.length} OR
        c.location ILIKE $${values.length}
      )`);
    }

    // 2. Handle project_id filter
    if (project_id) {
      values.push(project_id);
      conditions.push(`c.project_id = $${values.length}`);
    }

    if (jobnote) {
      values.push(jobnote);
      conditions.push(`c.jobnote = $${values.length}`);
  }

    // 3. Handle statuses filter
    if (statuses) {
      // Frontend sends statuses as a comma-separated string, e.g., "Active,Expired"
      const statusArray = statuses.split(',');
      values.push(statusArray);

      // This CASE statement replicates the logic of `calculateContractStatus` directly in SQL
      conditions.push(`
        (CASE
          WHEN NOW() < c.start_date THEN 'Pending'
          WHEN NOW() > c.end_date THEN 'Expired'
          WHEN c.end_date <= (NOW() + INTERVAL '3 months') THEN 'Expiring Soon'
          ELSE 'Active'
        END) = ANY($${values.length})
      `);
    }

    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = ' WHERE ' + conditions.join(' AND ');
    }

    //  Dynamic ORDER BY Clause 
    const sortClauses = [];
    // Loop up to 2, for max 2 sort conditions
    for (let i = 1; i <= 2; i++) {
      const sortBy = req.query[`sort_by_${i}`];
      const sortDirInput = req.query[`sort_dir_${i}`];
      const sortDir = sortDirInput ? sortDirInput.toLowerCase() : undefined;
      const isAllowed = sortBy && allowedSortColumns[sortBy] && (sortDir === 'asc' || sortDir === 'desc');

      if (isAllowed) {
        sortClauses.push(`${allowedSortColumns[sortBy]} ${sortDir.toUpperCase()}`);
      }
    }

    let orderByClause = 'ORDER BY c.contract_id DESC'; // Default sort
    if (sortClauses.length > 0) {
      orderByClause = 'ORDER BY ' + sortClauses.join(', ');
    }

    // 1. For counting total items (no limit, offset, or sorting needed)
    const countQuery = `SELECT COUNT(*) AS total_count ${baseQuery} ${whereClause}`;
    const countValues = [...values]; // Values for the WHERE clause only

    // 2. For fetching the actual page of data
    // add limit and offset to the values array and use their index for placeholders
    const dataValues = [...values];
    dataValues.push(limit);
    const limitPlaceholder = `$${dataValues.length}`;
    dataValues.push(offset);
    const offsetPlaceholder = `$${dataValues.length}`;

    const dataQuery = `
        SELECT c.*, p.project_name, cl.client_name, u.username, cl.dedicated_number,
          (CASE
            WHEN NOW() < c.start_date THEN 'Pending'
            WHEN NOW() > c.end_date THEN 'Expired'
            WHEN c.end_date <= (NOW() + INTERVAL '3 months') THEN 'Expiring Soon'
            ELSE 'Active'
          END) as contract_status
        ${baseQuery}
        ${whereClause}
        ${orderByClause}
        LIMIT ${limitPlaceholder}
        OFFSET ${offsetPlaceholder}
      `;

      // --- Execute queries ---
    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataValues),
      pool.query(countQuery, countValues)
    ]);

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total_count, 10)
    });

  } catch (err) {
    console.error('Error executing contract query:', err.stack);
    res.status(500).json({ error: 'Server error while fetching contracts' });
  }
});

// GET all contracts that are expiring soon for the notification review page
router.get('/expiring-for-notice', async (req, res) => {
  try {
    const query = `
      SELECT
        c.*, -- Select all columns from the contracts table
        cl.client_name,
        p.project_name
      FROM contracts c
      LEFT JOIN clients cl ON c.client_id = cl.client_id
      LEFT JOIN projects p ON c.project_id = p.project_id
      WHERE c.end_date BETWEEN NOW() AND NOW() + INTERVAL '3 months'
      ORDER BY c.end_date ASC
    `;
    const result = await pool.query(query);

    // Calculate status for each contract before sending
    // in the future we will add a status call renewed
    const contractsWithStatus = result.rows.map(contract => ({
      ...contract,
      contract_status: 'Expiring Soon' // We know this from the WHERE clause
    }));

    res.json(contractsWithStatus);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error while fetching expiring contracts' });
  }
});

// Get a single contract by contract_id
router.get('/:contract_id', async (req, res) => {
  const { contract_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT
        c.*,
        p.project_name,
        cl.client_name,
        cl.dedicated_number
      FROM Contracts c
      LEFT JOIN projects p ON c.project_id = p.project_id
      LEFT JOIN clients cl ON c.client_id = cl.client_id
      WHERE c.contract_id = $1`,
      [contract_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    // Add contract_status dynamically
    const contract = {
      ...result.rows[0],
      contract_status: calculateContractStatus(result.rows[0].start_date, result.rows[0].end_date)
    };
    res.json(contract);
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a contract
router.post('/', async (req, res) => {
  const {
    client_id,
    user_id,
    start_date,
    end_date,
    client,
    alias,
    jobnote,
    sales,
    contract_name,
    location,
    category,
    t1,
    t2,
    t3,
    preventive,
    report,
    other,
    remarks,
    period,
    response_time,
    service_time,
    spare_parts_provider,
    project_id
  } = req.body;

  if (!client_id || !user_id || !start_date || !end_date || !category || !jobnote) {
    return res.status(400).json({ error: 'Missing required fields: client_id, user_id, start_date, end_date, category, jobnote' });
  }

  const dateError = validateContractDates(start_date, end_date);
  if (dateError) {
    return res.status(400).json({ error: dateError });
  }

  try {
    const clientCheck = await pool.query('SELECT 1 FROM Clients WHERE client_id = $1', [client_id]);
    if (clientCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    const userCheck = await pool.query('SELECT 1 FROM Users WHERE user_id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    if (project_id) {
      const projectCheck = await pool.query('SELECT 1 FROM projects WHERE project_id = $1', [project_id]);
      if (projectCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid project_id' });
      }
    }

    let client_code;
    try {
      client_code = await generateContractCode(category, client_id);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    
    const renew_code = null; // Set to null until purpose is clarified

    const result = await pool.query(
      `INSERT INTO Contracts (
        client_id, user_id, start_date, end_date, client_code, renew_code,
        client, alias, jobnote, sales, contract_name, location, category,
        t1, t2, t3, preventive, report, other, remarks,
        period, response_time, service_time, spare_parts_provider, project_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        client_id,
        user_id,
        start_date,
        end_date,
        client_code,
        renew_code,
        client || null,
        alias || null,
        jobnote,
        sales || null,
        contract_name || null,
        location || null,
        category,
        t1 || null,
        t2 || null,
        t3 || null,
        preventive || null,
        report || null,
        other || null,
        remarks || null,
        period || null,
        response_time || null,
        service_time || null,
        spare_parts_provider || null,
        project_id || null
      ]
    );
    // Add contract_status dynamically
    const contract = {
      ...result.rows[0],
      contract_status: calculateContractStatus(start_date, end_date)
    };
    res.status(201).json(contract);
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Contract code already exists' });
    }
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid foreign key reference' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a contract
router.put('/:contract_id', async (req, res) => {
  const { contract_id } = req.params;
  const {
    client_id,
    user_id,
    start_date,
    end_date,
    client,
    alias,
    jobnote,
    sales,
    contract_name,
    location,
    category,
    t1,
    t2,
    t3,
    preventive,
    report,
    other,
    remarks,
    period,
    response_time,
    service_time,
    spare_parts_provider,
    project_id
  } = req.body;

  if (!client_id || !user_id || !start_date || !end_date || !category || !jobnote) {
    return res.status(400).json({ error: 'Missing required fields: client_id, user_id, start_date, end_date, category, jobnote' });
  }

  

  try {
    const clientCheck = await pool.query('SELECT 1 FROM Clients WHERE client_id = $1', [client_id]);
    if (clientCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    const userCheck = await pool.query('SELECT 1 FROM Users WHERE user_id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    if (project_id) {
      const projectCheck = await pool.query('SELECT 1 FROM projects WHERE project_id = $1', [project_id]);
      if (projectCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid project_id' });
      }
    }

    const result = await pool.query(
      `UPDATE Contracts SET
        client_id = $1, user_id = $2, start_date = $3, end_date = $4,
        client = $5, alias = $6, jobnote = $7, sales = $8, contract_name = $9,
        location = $10, category = $11, t1 = $12, t2 = $13, t3 = $14,
        preventive = $15, report = $16, other = $17,
        remarks = $18, period = $19, response_time = $20, service_time = $21,
        spare_parts_provider = $22, project_id = $23
      WHERE contract_id = $24 RETURNING *`,
      [
        client_id,
        user_id,
        start_date,
        end_date,
        client || null,
        alias || null,
        jobnote,
        sales || null,
        contract_name || null,
        location || null,
        category || null,
        t1 || null,
        t2 || null,
        t3 || null,
        preventive || null,
        report || null,
        other || null,
        remarks || null,
        period || null,
        response_time || null,
        service_time || null,
        spare_parts_provider || null,
        project_id || null,
        contract_id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    // Add contract_status dynamically
    const contract = {
      ...result.rows[0],
      contract_status: calculateContractStatus(start_date, end_date)
    };
    res.json(contract);
  } catch (err) {
    console.error(err.stack);
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid foreign key reference' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a contract
router.delete('/:contract_id', async (req, res) => {
  const { contract_id } = req.params;
  try {
    const result = await pool.query('DELETE FROM Contracts WHERE contract_id = $1 RETURNING *', [contract_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }
    res.json({ message: 'Contract deleted successfully' });
  } catch (err) {
    console.error(err.stack);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;