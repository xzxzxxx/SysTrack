# SysTrack Data Dictionary

## Overview
This data dictionary documents the database schema for SysTrack application. All tables use PostgreSQL with auto-incrementing primary keys and appropriate foreign key relationships.

## Tables

### **users**
Stores user accounts and authentication information.

| Column Name | Data Type | Length | Constraints | Description |
|-------------|-----------|--------|-------------|-------------|
| user_id | integer | - | PRIMARY KEY, NOT NULL, AUTO INCREMENT | Unique identifier for users |
| email | varchar | 255 | NOT NULL, UNIQUE | User email address for login |
| password_hash | varchar | 255 | NOT NULL | Bcrypt hashed password |
| role | varchar | 50 | NOT NULL, DEFAULT 'user' | User role (admin, sales, ae, user) |
| username | varchar | 50 | NOT NULL, UNIQUE, DEFAULT 'user' | Display name for user |
| created_at | timestamptz | - | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| updated_at | timestamp | - | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

**Indexes:**
- `idx_users_username` on username (btree)

---

### **clients**
Stores client information and company details.

| Column Name | Data Type | Length | Constraints | Description |
|-------------|-----------|--------|-------------|-------------|
| client_id | integer | - | PRIMARY KEY, NOT NULL, AUTO INCREMENT | Unique identifier for clients |
| client_name | varchar | 255 | NOT NULL | Company or client name |
| dedicated_number | varchar | 20 | NOT NULL | Auto-generated client code (e.g., A01, B02) |
| email | varchar | 255 | NULLABLE | Optional client contact email |
| created_at | timestamptz | - | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | timestamp | - | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

**Indexes:**
- `idx_clients_client_name` on client_name (btree)

**Business Rules:**
- `dedicated_number` is auto-generated based on first letter of client_name
- Order and renewal counts are calculated dynamically from contracts table

---

### **projects**
Stores project information linked to clients and users.

| Column Name | Data Type | Length | Constraints | Description |
|-------------|-----------|--------|-------------|-------------|
| project_id | integer | - | PRIMARY KEY, NOT NULL, AUTO INCREMENT | Unique identifier for projects |
| project_name | varchar | 255 | NOT NULL | Project name |
| client_id | integer | - | NOT NULL, FOREIGN KEY | Reference to clients.client_id |
| user_id | integer | - | NOT NULL, FOREIGN KEY | Creator, Reference to users.user_id |
| created_at | timestamp | - | DEFAULT CURRENT_TIMESTAMP | Project creation timestamp |
| updated_at | timestamp | - | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

**Foreign Keys:**
- `client_id` REFERENCES clients(client_id)
- `user_id` REFERENCES users(user_id)

**Indexes:**
- `idx_projects_client_id` on client_id (btree)

---

### **contracts**
Stores contract details, SLA information, and service agreements.

| Column Name | Data Type | Length | Constraints | Description |
|-------------|-----------|--------|-------------|-------------|
| contract_id | integer | - | PRIMARY KEY, NOT NULL, AUTO INCREMENT | Unique identifier for contracts |
| customer | text | - | NULLABLE | Customer name (legacy field) |
| alias | text | - | NULLABLE | Client alias or short name |
| client_code | text | - | NULLABLE | Client reference code |
| renew_code | text | - | NULLABLE | Renewal tracking code |
| jobnote | text | - | NULLABLE | Job or service description |
| sales | text | - | NULLABLE | Sales representative name |
| contract_name | text | - | NULLABLE | Contract title or description |
| location | text | - | NULLABLE | Service location or address |
| category | text | - | NULLABLE | Service category (SVR, DSS, EMB, Medical) |
| start_date | date | - | NULLABLE | Contract start date |
| end_date | date | - | NULLABLE | Contract expiration date |
| remarks | text | - | NULLABLE | Additional notes or comments |
| t1 | text | - | NULLABLE | 1st support ae |
| t2 | text | - | NULLABLE | 2nd support ae |
| t3 | text | - | NULLABLE | 3rd support ae |
| period | text | - | NULLABLE | Service period (e.g., 8x5, 24x7) |
| response_time | text | - | NULLABLE | SLA response time (e.g., 4hr) |
| service_time | text | - | NULLABLE | SLA service time (e.g., NBD) |
| spare_part_provider | text | - | NULLABLE | Parts provider information |
| preventive | text | - | NULLABLE | Preventive maintenance schedule |
| report | text | - | NULLABLE | Reporting requirements |
| other | text | - | NULLABLE | Other SLA terms |
| previous_contract | text | - | NULLABLE | Reference to previous contract for renewals |
| client_id | integer | - | FOREIGN KEY | Reference to clients.client_id |
| user_id | integer | - | FOREIGN KEY | Reference to users.user_id |
| project_id | integer | - | FOREIGN KEY | Reference to projects.project_id |
| created_at | timestamp | - | DEFAULT CURRENT_TIMESTAMP | Contract creation timestamp |
| additional_info | text | - |  NULLABLE | Temp column for separating contract_name |

**Foreign Keys:**
- `client_id` REFERENCES clients(client_id) ON DELETE RESTRICT
- `user_id` REFERENCES users(user_id) ON DELETE RESTRICT  
- `project_id` REFERENCES projects(project_id) ON DELETE RESTRICT

**Indexes:**
- `idx_contracts_client_id` on client_id (btree)
- `idx_contracts_user_id` on user_id (btree)
- `idx_contracts_project_id` on project_id (btree)
- `idx_contracts_category` on category (btree)

**Business Rules:**
- Contract status is computed based on end_date (Active/Expiring Soon/Expired)
- Auto-generated contract codes follow pattern: {category}{year}{dedicated_number}{count}

---

### **maintenance_records**
Stores maintenance requests and service records with various status tracking.

| Column Name | Data Type | Length | Constraints | Description |
|-------------|-----------|--------|-------------|-------------|
| maintenance_id | integer | - | PRIMARY KEY, NOT NULL, AUTO INCREMENT | Unique identifier for maintenance records |
| service_date | date | - | NULLABLE | Scheduled or completed service date |
| service_code | text | - | NULLABLE | Service request code or ticket number |
| client | text | - | NULLABLE | Client name for service |
| alias | text | - | NULLABLE | Client alias or short reference |
| client_code | text | - | NULLABLE | Client reference code |
| jobnote | text | - | NULLABLE | Job description or service notes |
| location_district | text | - | NULLABLE | Service location or district |
| is_warranty | boolean | - | NULLABLE | Whether service is under warranty |
| ae | text | - | NULLABLE | ae assigned (not using) |
| sales | text | - | NULLABLE | Sales representative |
| product_model | text | - | NULLABLE | Product or equipment model |
| serial_no | text | - | NULLABLE | Equipment serial number |
| problem_description | text | - | NULLABLE | Description of reported issue |
| solution_details | text | - | NULLABLE | Details of solution provided |
| labor_details | text | - | NULLABLE | Labor work performed |
| parts_details | text | - | NULLABLE | Parts used or replaced |
| arrive_time | time | - | NULLABLE | Technician arrival time |
| depart_time | time | - | NULLABLE | Technician departure time |
| completion_date | date | - | NULLABLE | Service completion date |
| remark | text | - | NULLABLE | Additional remarks or notes |
| service_type | text | - | NULLABLE | Type of service performed |
| product_type | text | - | NULLABLE | Category of product serviced |
| support_method | text | - | NULLABLE | Method of support provided |
| symptom_classification | text | - | NULLABLE | Classification of problem type |
| maintenance_status | text | - | NULLABLE | Legacy status field |
| status | text | - | NULLABLE | Current status (New, Pending, In Progress, Closed) |
| client_id | integer | - | FOREIGN KEY | Reference to clients.client_id |
| user_id | integer | - | FOREIGN KEY | Reference to users.user_id |
| created_at | timestamp | - | DEFAULT CURRENT_TIMESTAMP | Record creation timestamp |
| updated_at | timestamp | - | DEFAULT CURRENT_TIMESTAMP | Last modification timestamp |

**Foreign Keys:**
- `client_id` REFERENCES clients(client_id) ON DELETE SET NULL
- `user_id` REFERENCES users(user_id) ON DELETE SET NULL

**Indexes:**
- `idx_maintenance_records_client_id` on client_id (btree)
- `idx_maintenance_records_user_id` on user_id (btree)
- `idx_maintenance_records_ae` on ae (btree)
- `idx_maintenance_records_status` on maintenance_status (btree)

---

### **maintenance_request_pics**
Junction table linking maintenance records to multiple responsible persons (PICs).

| Column Name | Data Type | Length | Constraints | Description |
|-------------|-----------|--------|-------------|-------------|
| id | integer | - | PRIMARY KEY, NOT NULL, AUTO INCREMENT | Unique identifier for relationship |
| maintenance_request_id | integer | - | NOT NULL, FOREIGN KEY | Reference to maintenance_records.maintenance_id |
| pic_user_id | integer | - | NOT NULL, FOREIGN KEY | Reference to users.user_id |

**Foreign Keys:**
- `maintenance_request_id` REFERENCES maintenance_records(maintenance_id) ON DELETE CASCADE
- `pic_user_id` REFERENCES users(user_id) ON DELETE CASCADE

**Constraints:**
- UNIQUE(maintenance_request_id, pic_user_id) - Prevents duplicate assignments

---

### **pending_registrations**
Temporary storage for user registration requests awaiting admin approval.

| Column Name | Data Type | Length | Constraints | Description |
|-------------|-----------|--------|-------------|-------------|
| id | integer | - | PRIMARY KEY, NOT NULL, AUTO INCREMENT | Unique identifier for pending request |
| username | varchar | 255 | NOT NULL | Requested username |
| email | varchar | 255 | NOT NULL, UNIQUE | User email address |
| password_hash | varchar | 255 | NOT NULL | Bcrypt hashed password |
| role | varchar | 50 | NOT NULL, CHECK CONSTRAINT | Requested role (admin, sales, ae) |
| status | varchar | 50 | DEFAULT 'pending' | Approval status |
| requested_at | timestamp | - | DEFAULT CURRENT_TIMESTAMP | Registration request timestamp |

**Constraints:**
- CHECK: role IN ('admin', 'sales', 'ae')

---

## Relationships Summary

### One-to-Many Relationships
- **users** → **projects** (user_id)
- **users** → **contracts** (user_id) 
- **users** → **maintenance_records** (user_id)
- **clients** → **projects** (client_id)
- **clients** → **contracts** (client_id)
- **clients** → **maintenance_records** (client_id)
- **projects** → **contracts** (project_id)

### Many-to-Many Relationships
- **maintenance_records** ↔ **users** (via maintenance_request_pics)

---

## Naming Conventions
- **Tables**: lowercase with underscores (snake_case)
- **Columns**: lowercase with underscores (snake_case)  
- **Primary Keys**: {table_name}_id
- **Foreign Keys**: {referenced_table}_id
- **Indexes**: idx_{table}_{column(s)}

## Data Types Used
- **integer**: Auto-incrementing IDs and numeric references
- **varchar(n)**: Fixed-length strings with specified limits
- **text**: Variable-length strings without size limit
- **date**: Date values (YYYY-MM-DD)
- **time**: Time values without timezone
- **timestamp**: Timestamp without timezone
- **timestamptz**: Timestamp with timezone
- **boolean**: True/false values

## Remark
- Some fields should be NOT NULL but due to existing incomplete data fomr excel
