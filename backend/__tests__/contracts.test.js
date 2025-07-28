// In backend/routes/contracts.test.js

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// This line tells Jest to use our fake version of the 'pg' module.
jest.mock('pg', () => {
  const mPool = {
    // We mock the query function to return a successful promise by default.
    // Individual tests will override this to simulate different scenarios.
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

const { Pool } = require('pg');
const contractsRouter = require('../routes/contracts');

// Create a simple Express app for testing purposes
const app = express();
app.use(bodyParser.json());
app.use('/contracts', contractsRouter); // Mount your router

// This is the complete, valid contract object we will use for our tests.
const validContractPayload = {
  client_id: 1,
  user_id: 1,
  start_date: '2025-08-01',
  end_date: '2026-07-31',
  client: 'Global Tech Inc.',
  alias: 'GTI',
  jobnote: 'Annual Server Maintenance',
  sales: 'John Doe',
  contract_name: 'GTI Server Maintenance 2025',
  location: 'Data Center A, Building 3',
  category: 'SVR', // 'SVR' maps to 'MS'
  t1: 'Alice',
  t2: 'Bob',
  t3: 'Charlie',
  preventive: 'Quarterly',
  report: 'Yes',
  other: 'Includes emergency support',
  remarks: 'Client requires 24-hour notice before on-site visits.',
  period: '8*5',
  response_time: '4hrs',
  service_time: 'NBD',
  spare_parts_provider: 'cwc',
  project_id: 101,
};

describe('POST /contracts', () => {
  let pool;

  beforeEach(() => {
    // Before each test, get a fresh instance of our mocked pool and clear all mocks
    pool = new Pool();
    jest.clearAllMocks();
  });

  // Test Case 1: The "Happy Path" - Successful Creation
  it('should create a contract successfully when provided with valid data', async () => {
    // --- Mocking the Database Sequence ---
    
    // 1. Route check: client exists
    pool.query.mockResolvedValueOnce({ rows: [{ '1': 1 }], rowCount: 1 });
    // 2. Route check: user exists
    pool.query.mockResolvedValueOnce({ rows: [{ '1': 1 }], rowCount: 1 });
    // 3. Route check: project exists
    pool.query.mockResolvedValueOnce({ rows: [{ '1': 1 }], rowCount: 1 });
    // 4. generateContractCode: fetch dedicated_number
    pool.query.mockResolvedValueOnce({ rows: [{ dedicated_number: 'G01' }], rowCount: 1 });
    // 5. generateContractCode: count existing contracts
    pool.query.mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });
    // 6. generateContractCode: check for duplicate client_code
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // 7. Final INSERT query
    pool.query.mockResolvedValueOnce({
      rows: [{
        ...validContractPayload,
        contract_id: 123,
        client_code: 'MS25G0103',
      }],
      rowCount: 1
    });

    // --- Making the API Request ---
    const response = await request(app)
      .post('/contracts')
      .send(validContractPayload);

    // --- Assertions ---
    expect(response.status).toBe(201); // Check for "201 Created" status
    expect(response.body).toHaveProperty('contract_id');
    expect(response.body.client_code).toBe('MS25G0103'); // Verify the code was generated correctly
  });

  // Test Case 2: Missing Required Field
  it('should return a 400 error if a required field is missing', async () => {
    const incompletePayload = { ...validContractPayload };
    delete incompletePayload.jobnote; // Remove a required field

    const response = await request(app)
      .post('/contracts')
      .send(incompletePayload);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Missing required fields: client_id, user_id, start_date, end_date, category, jobnote');
  });

  // Test Case 3: Invalid Date Logic
  it('should return a 400 error if the end date is before the start date', async () => {
    const invalidDatePayload = {
      ...validContractPayload,
      start_date: '2026-08-01',
      end_date: '2025-07-31', // End date is before start date
    };

    const response = await request(app)
      .post('/contracts')
      .send(invalidDatePayload);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'End date must be after the start date.');
  });

  // Test Case 4: Foreign Key Violation (Client doesn't exist)
  it('should return a 400 error if the client_id does not exist', async () => {
    // Mock the database to return no rows for the client check

    // The very first database call the route makes is the client check.
    // We only need to mock that single call to fail.
    pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const response = await request(app)
      .post('/contracts')
      .send(validContractPayload);

    // The code should see no rows and immediately return the "Invalid client_id" error.
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid client_id');
  });
});