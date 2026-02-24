# SysTrack

SysTrack is a web-based data management application designed to replace Excel-based workflows with a robust PostgreSQL database. Built with a React frontend and Node.js backend, it offers a user-friendly interface for sales and account executive teams to manage clients and contracts efficiently. This project, developed as part of an internship, is designed to be maintainable and scalable for future developers, with plans for cloud deployment and database backups.

## Table of Contents

- Purpose
- Features
- Tech Stack
- File Structure
- Database Schema
- Setup Instructions
- Usage
- Work Flow
- Deployment Process
- Future Enhancements
- Contact

## Purpose

SysTrack aims to streamline client and contract management by providing a centralized, searchable, and sortable interface. It replaces manual Excel tracking with a database-driven solution, enabling teams to:

- Track client details (e.g., orders, renewals) and contract statuses.
- Automate contract code generation and enforce data integrity.
- Prepare for scalability with cloud hosting and regular backups.


## Features

- **Dashboard**: 
    - View total clients, contracts, and contracts expiring within 3 months.
- **Client Management**:
    - Add, edit, delete clients with simplified creation process (name and optional email only).
    - Auto-generated dedicated numbers (e.g., A01, A02) based on first letter of client name with fallback to 'X' for non-letter starts.
    - Dynamic calculation of order and renewal counts from contracts table.
    - Search by client name, dedicated number, ID, or email.
    - Sort by number of orders or renewals.
- **Contract Management**:
    - Add, edit, delete contracts with auto-generated codes (e.g., `MS25A0103`, based on category, year, dedicated number, and order count).
    - Searchable dropdowns for client and project selection using AsyncSelect with backend filtering.
    - Multi-field search across contract name, client, job note, and location, with debounce optimization (300ms).
    - Filtering by status (e.g., Active, Pending, Expiring Soon, Expired) and category (e.g., SVR, DSS, EMB, Medical).
    - Multi-column sorting (up to 2 columns) with shift-key support for adding secondary sorts.
    - Movable and removable columns using drag-and-drop (@hello-pangea/dnd) for customizable views.
    - View all contract fields in a details modal.
    - Renew contracts by searching existing contracts and creating new ones with updated dates and job notes.
    - Support for renewal tracking via previous_contract field. (not apply to the old data)
- **Project Management**:
    - View a paginated list of projects with associated clients, users, and contracts.
    - Backend search functionality by project name.
    - Each project card includes a link to view related contracts.
- **Maintenance Records** (Developing)：
    - Track maintenance requests and records, combining different statuses (e.g., New, Pending, In Progress, Closed).
    - Full CRUD operations with form for creating/editing requests.
    - Advanced filtering by status, search across multiple fields (e.g., service_code, client_name), and multi-column sorting (up to 2 columns).
    - Pagination (50 items per page) and customizable columns (movable/removable via drag-and-drop).
    - Radio button groups for categorical fields (e.g., service_type, product_type).
    - The layout, backend, and database have been completed. Other features, such as frontend, full authentication and integrated notifications, are still pending implementation.
- **Settings Page**：
    - Allows admins to approve pending user registrations via a list with approve/reject actions.
    - Enables users to change passwords with validation (e.g., match confirmation, minimum length).
    - Uses JWT decoding for user role checks and secure API calls.
- **Email Notification**：
    - Review page for expiring contracts, with pre-selection of un-renewed ones and checkbox exclusions.
    - Email preview modal showing formatted content (e.g., table with columns like Contract ID, Client Name, End Date).
    - Sends professional emails via Nodemailer with dynamic subject lines (e.g., "Maintenance contract reminder (August 2025)").
- **User Authentication**:
    - Login/register with email and password.
    - JWT-based authentication for secure access.
- **Search Bar**: Reusable component with real-time feedback (300ms debounce) and clear button.
- **Column Customization**: Filter and reorder table columns for personalized views.

## Tech Stack

- **Frontend**:
    - React.js for dynamic UI.
    - Bootstrap for styling.
    - React Router for navigation.
    - Axios for API calls.
    - `lodash.debounce` for search optimization.
    - `react-select` and `AsyncSelect` for autocomplete and searchable dropdowns.
    - `@hello-pangea/dnd` for drag-and-drop column reordering.
- **Backend**:
    - Node.js with Express.js for RESTful APIs.
    - PostgreSQL for data storage.
    - `pg` for database queries.
    - `jsonwebtoken` for authentication.
    - `bcrypt` for password hashing.
    - `dotenv` for environment variable management.
    - `nodemailer` for email notifications.
- **Database**: PostgreSQL with tables for Users, Clients, Contracts, Projects, and Maintenance Records.


## File Structure

```
data-management-app/
├── backend/
│   ├── routes/             # API routes
│   │   ├── auth.js         # Login/register endpoints
│   │   ├── clients.js      # Client CRUD, search, and auto-generation
│   │   ├── contracts.js    # Contract CRUD and search
│   │   ├── users.js        # User management
│   │   └── projects.js     # Project CRUD with pagination 
│   │   └── notification.js # Notify users for expiring soon contracts
│   │   └── maintenanceRecords.js  # Maintenance records CRUD 
│   │
│   ├── middleware/         # Authentication middleware
│   │   └── auth.js         # JWT verification
│   │   └── checkRole.js    # Role checking
│   ├── config/
│   ├── scripts/            # Database schema and test data (e.g., schema.sql)
│   ├── index.js            # Backend entry point
│   ├── package.json
│   └── .env                # Environment variables (e.g., DATABASE_URL, JWT_SECRET)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── clients/    # Client-related components (e.g., ClientList.js, ClientForm.js)
│   │   │   ├── contracts/  # Contract-related components (e.g., ContractList.js, ContractForm.js)
│   │   │   ├── auth/       # Login/register components
│   │   │   ├── common/     # Reusable components (e.g., SearchBar, Navbar)
│   │   │   ├── dashboard/  # Dashboard component
│   │   │   └── projects/   # Project components (e.g., Projects.js)
│   │   │   └── maintenance/# Maintenance components
│   │   │   └── Setting.js  # Setting components
│   │   ├── utils/          # Helper functions (e.g., useColumnFilter.js, api.js)
│   │   ├── App.js          # Main React app
│   │   ├── index.js        # Frontend entry point
│   │   ├── .env            # Frontend environment
│   ├── package.json
│   └── public/
├── docs/                   # Feature-specific guides (e.g., SysTrack-Documentation.md)
└── README.md               # Project overview
```

## Database Schema

    - Please find it in script or Data dictionary
    - A non-automated scripts may help changing cleaned csv files to database at backend/scripts/excel_to_db_scripts.sql 

## Setup Instructions
1. ****
    - git clone https://github.com/xzxzxxx/SysTrack.git
2. **Backend**:
    - Install Node.js and PostgreSQL.
    - Navigate to `backend/` and Run `npm install` to install dependencies (`express`, `pg`, `jsonwebtoken`, `bcrypt`, `dotenv`).
    - Create a `.env` file with `DATABASE_URL` and `JWT_SECRET`.
    - Set up the PostgreSQL database
    - Apply recent schema updates (add email column to Clients, remove redundant count columns, add previous_contract to Contracts).
    - Start the server: `npm start` (runs on `http://localhost:3000`).
3. **Frontend**:
    - Navigate to `frontend/`.
    - Run `npm install` to install dependencies (`react`, `axios`, `react-router-dom`, `react-select`, `lodash`, `@hello-pangea/dnd`).
    - Start the development server: `npm start` (runs on `http://localhost:3001`).
4. **Database**:
    - Ensure PostgreSQL is running and the database is created.
    - Apply schema and test data from `scripts/`.
    - recommend using pgadmin4

Details are at README and user manuel

## Usage

1. **Access**: Open `http://localhost:3001` in a browser.
2. **Login/Register**: Use `/login` or `/register` to authenticate.
3. **Dashboard**: View stats (clients, contracts, expiring soon).
4. **Clients**:
    - Go to `/clients` to view, search, or manage clients.
    - Create clients with only name (required) and email (optional).
    - Search by name, dedicated number, ID, or email.
    - Sort by dynamically calculated orders or renewals.
5. **Contracts**:
    - Go to `/contracts` to view, search, or manage contracts.
    - Use searchable dropdowns for client and project selection.
    - Search by client code, contract name, or job note.
    - Create or renew contracts via `/contracts/new` or `/contracts/renew`.
6. **Projects**:
    - Go to `/projects` to view a paginated list of projects.
    - Search projects by name.
    - Click "View Contracts" to see contracts filtered by project ID.
7. **Maintenance Records**:
    - Go to `/maintenance` to view, search, or manage records.
    - Filter by status and fields, sort by columns, and paginate results.
    - Create/edit via form with radio groups for categories.
    - Follow up unfinished case by creaating new records.
8. **Settings**:
    - Go to `/settings` for admin approvals
    - Password changes.
9. **Email Notification**:
    - Go to `/contracts/notify` to select expiring contracts and preview and sned emails.
10. **Search**: Type in search bars for real-time results (300ms debounce).

## Work Flow
1. **Dashboard**
    1. Frontend sends GET request to /api/dashboard with JWT token
    2. Backend queries database for:
        - Total client count from clients table
        - Total contract count from contracts table
        - Expiring contracts (end_date within 3 months) from contracts table
    3. API returns aggregated data as JSON
    4. Frontend displays statistics in card layout using Bootstrap components
2. **Client Management**
    - View Clients: User navigates to /clients
        1. Frontend calls GET /api/clients with pagination params
        2. Backend returns paginated client list with dynamic counts
        3. Display in sortable table with search functionality

    - Create Client: User clicks "Add Client"
        1. Form validates required name field and optional email
        2. Frontend sends POST /api/clients with client data
        3. Backend auto-generates dedicated number (e.g., A01, A02) based on first letter
        4. Database inserts record and returns new client data
        5. Frontend updates list and shows success message
    
    - Search/Filter: User types in search bar
        1. Debounced input (300ms) triggers GET /api/clients with search params
        2. Backend performs SQL LIKE queries on name, dedicated_number, ID, email
        3. Results update in real-time
    - Dynamic Counts:
        - Backend calculates order/renewal counts via JOIN with contracts table
        - Renewal require further data (setup a column previous_contract but currently not using)
        - No stored counts in clients table (removed redundant columns)

3. **Contract Management**
    - View Contracts: User accesses /contracts
        1. Frontend calls GET /api/contracts with filters (status, category), pagination, and sort params
        2. Backend returns contracts with computed status and category
        3. Display with customizable columns (drag-and-drop, reordering)

    - Create Contract: User clicks "New Contract"
        1. Form loads with searchable dropdowns for clients/projects (AsyncSelect)
            - Prevent alias clients name
            - Allow users to create new clients and projects
        2. Default SLA values pre-filled (8x5 Period, 4hr Response, NBD Service Time)
        3. Auto-generated contract code based on category, year, dedicated number, order count
        4. Frontend sends POST /api/contracts with form data
        5. Backend validates and inserts with FK relationships

    - Advanced Filtering:
        - Status filter: User selects checkboxes (Active, Pending, Expiring Soon, Expired)
        - Category filter: User selects from SVR, DSS, EMB, Medical options
        - Search: Multi-field search across contract_name, client_name, jobnote, location
        - Frontend sends combined filter params to backend

    - Multi-Column Sorting:
        - User clicks column headers (shift-click for secondary sort)
        - Frontend manages sortConfigs array (max 2 columns)
        - Backend applies ORDER BY with multiple columns and directions

    - Column Customization:
        - Please check below
    - Pagination:
        - Please check below

4. Project Management
    1. User navigates to /projects
    2. Frontend calls GET /api/projects with pagination params
    3. Backend returns projects with associated client/user info via JOINs
    4. Search functionality: User types project name → debounced API call
    5. "View Contracts" link redirects to /contracts?project_id=X
    6. Contract list filters by project_id automatically

5. Maintenance Records (Partly finished)
    - View Records: 
        - User accesses /maintenance
        - GET /api/maintenance-records with status filters and pagination
        - Display in table with customizable columns (drag-and-drop)
        - Same as Contracts page
    - Create New Request:
        1. User clicks "New Request" and fills Core Request Information
        2. Form validates required fields and data types
        3. POST/PUT /api/maintenance-records with form data and status "New"
    - Create Maintenance:
        1. User edits maintenance request with status "NEW" and assign PIC
        2. Form validates and set status "Pending"
        3. Before maintenance, user edits maintenance request with status "Pending" and fills Service Date
        4. Form validates and set status "In Progress"
        5. After maintenance, user edits maintenance request with status "In Progress" and fills all remaining details. 
        6. Form validates and set status "Closed"
        - All status can be worked at onnce but not recommended
        - Maintenance Subject & Classification have default values
        - Below are developing
            - Form loads with searchable dropdowns for clients (AsyncSelect)
            - Date and logic validation
            - Report of maintenance records GROUP BY contracts
    - Filtering and Sorting
        1. Status checkboxes (New, Pending, In Progress, Closed selected by default)
        2. Text search across service_code, client_name, jobnote fields
        3. Debounced search (300ms) with real-time results
        4. Sort by maintenance_id, status, service_date, created_at, etc.
        5. Multi-column sorting (similar to contracts, max 2 columns)
    - Pagination:
        Please check below

6. Settings Page
    - Access Control: 
        1. User navigates to /settings
        2. Frontend decodes JWT token using jwtDecode
        3. Checks user role from token payload
        4. Redirects to /login if invalid token
    - Admin Approval (admin role only):
        1. GET /api/auth/pending-registrations returns unverified users
        2. Display in table with username, email, role, requested_at
        3. Admin clicks Approve/Reject buttons
        4. POST /api/auth/approve-registration/:id with approve boolean
        5. Updates database user status and removes from pending list
    - Password Change (all users):
        - Form validates old password, new password, confirmation match
        - Checks minimum length (8 characters)
        - POST /api/auth/change-password with credentials
        - Backend verifies old password with bcrypt
        - Hashes new password and updates database
        - Shows success/error feedback
    - Expire Soon Controller (all users):
        - Change number of month count as expiring soon (session only)
        - Reset button to default 3 months

7. Email Notification
    - Review Expiring Contracts: 
        1. User accesses /notifications/review
        2. GET /api/contracts/expiring-for-notice returns contracts expiring in 3 months (Adjustable)
        3. NotificationReview.js pre-selects un-renewed contracts
            - check no renew code now
            - use previous_contracts / enhence renew code system
        4. Display with checkboxes for inclusion/exclusion
    - Email Preview: 
        1. User clicks "Preview Email"
        2. EmailPreviewModal.js opens with formatted email content
        3. Dynamic subject line: "Maintenance contract reminder (Month Year)"
        4. Table shows selected contracts with columns: Contract ID, Client Code, End Date, etc.
        5. Email template with greeting and signature
    - Send Email: User confirms and clicks "Send"
        1. POST /api/notifications/send-renewal-email with selected contract IDs
        2. Backend uses Nodemailer with Gmail SMTP
        3. Email sent to configured recipient (RECIPIENT_EMAIL in .env)
        4. Success/error feedback displayed to user

8. User Authentication
    - Login: User submits credentials at /login
        1. POST /api/auth/login with email/password
    2. Backend verifies with bcrypt hash comparison
    3. Returns JWT token with user info (id, email, role, exp)
    4. Frontend stores token in localStorage
    5. Redirects to dashboard
    - Registration: User submits form at /register
    1. POST /api/auth/register with user data
    2. Backend hashes password with bcrypt
    3. Creates pending user record (requires admin approval)

9. Token Verification: Protected routes use middleware
    1. Frontend sends Authorization header: "Bearer {token}" by api.js
    2. Backend middleware verifies JWT signature and expiration
    3. Check TimeRemaining more than 30 minutes ->issuse a new token
    4. Extracts user info for request context

10. DefaultLayout and Log out due to inactivity
    1. Check user activity.
        - Inactivity for 15 minutes -> log out users
        - Active and check token -> reset timer
    2. A layout-container with child content

11. Common compoenet
    - Column Customization:
        1. User drags column headers to reorder
        2. Toggle column visibility via checkbox menu
        3. State persisted in localStorage using useColumnFilter hook

    - Pagination
    - SearchBar

## Deployment Process

    1. Login VM:
        - ssh user@192.168.0.153
        - u may find account details in another files or ask for the access
    2. Setup/ restore code
        - cd /var/www/SysTrack
        - git clone or git pull
    3. Transfer/ restore database
        - use pgadmin4 backup database in plain text
        - scp 'C:\Users\<your-username>\Downloads\backup' user@192.168.0.153:/var/www/SysTrack
        - Apply backup. psql -U systrack_user systrack_prod -f /var/www/SysTrack/backup;
        - Open postgres terminal. psql -U systrack_user -d systrack_prod(requre password)
    4. Build
        - Frontend
            1. cd frontend
            2. npm install (if update modules)
            3. npm run build

        -Backend
            1. cd ../backend
            2. pm2 restart systrack-api

        - Nginx
            -sudo systemctl restart nginx (if needed)

## Future Enhancements

- **Immediate Tasks**:
    - Add better form validation and duplication checks
    - Fix JWT verification issues: Currently, it attempts to refresh with expired tokens (rejected and logged in console). Implement a proper refresh token mechanism for secure, long-lived sessions (e.g., using separate access and refresh tokens stored securely).
    - Prevent send too many email by nodemailer. Notify users which cases are sent. 
    - Auto backup Database
    - Stop users from create accounts with same email. no validation check accross pending and users table currently.
- **Long-Term**:
    - Refactor for reusability: Components like pagination in contract page and search bar are not reused; create shared components in `common/` folder to avoid duplication across modules (e.g., a universal Pagination.js and SearchBar.js).
    - Separate maintenanceReocrds and maintenanceRequest table. One request can have multiple maintenance. It should be 1 to N relationship. Currently approvach are copying the same request to create a new maintenance record.
    - Implement role-based access (e.g., admin-only deletes)
    - Security improvements (e.g., input sanitization, rate limiting)
    - Cloud deployment and automated backups
    - Linking with jobnote
    - E Form for maintenance


## Contact

- Developer: Jonathan
- Email: jonathanliu03198@gmail.com


## Last Updated: 2025-08-97 12:21 PM HKT