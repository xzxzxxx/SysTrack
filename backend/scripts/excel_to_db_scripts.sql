SET TIME ZONE 'Asia/Hong_Kong';

-- import original table (unprocessed data from excel)
CREATE TABLE Clients (
    client_id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    dedicated_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- import table

ALTER TABLE Clients ADD COLUMN email character varying(255);

-- Users table: Stores user credentials and roles
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- an example user for testing purposes (remove in production)
INSERT INTO Users (user_id, email, password_hash, role)
VALUES (1, 'test@example.com', '$2b$10$aCWygfbKv4L7QKeVQGyR/.kEbOK09DfNrdnb4FEDOtlajsw27utgy', 'admin')

-- Project table:
CREATE TABLE public.projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    client_id integer NOT NULL,
    user_id integer NOT NULL
);

-- a temp table for importing data from excel
-- remove other header before importing (just one line left)
-- format date to YYYY-MM-DD in excel
-- then manual remove any error
CREATE TABLE Contracts (
    contract_id SERIAL PRIMARY KEY,
    input_date DATE,
    customer TEXT,
    alias TEXT,
    client_code TEXT,
    renew_code TEXT,
    jobnote TEXT,
    sales TEXT,
    "Project Name (if Need)" TEXT,
    location TEXT,
    category TEXT,
    t1 TEXT,
    t2 TEXT,
    t3 TEXT,
    "8*5" TEXT,
    "24*7" TEXT,
    "4 hrs" TEXT,
    "8 hrs" TEXT,
    nbd TEXT,
    "48 hrs" TEXT,
    client TEXT,
    cwc TEXT,
    preventive TEXT,
    report TEXT,
    other TEXT,
    start_date DATE,
    end_date DATE,
    remarks TEXT
);

ALTER TABLE Contracts
ALTER COLUMN input_date TYPE TIMESTAMP WITHOUT TIME ZONE
USING input_date::timestamp;

ALTER TABLE Contracts
ALTER COLUMN input_date SET DEFAULT CURRENT_TIMESTAMP;

alter table contracts
rename column "Project Name (if Need)" to "contract_name"

alter table contracts
rename column "input_date" to "created_at"

ALTER TABLE Contracts
ADD COLUMN period TEXT;

UPDATE Contracts
SET period = CASE
    WHEN "8*5" = 'v' THEN '8*5'
    WHEN "24*7" = 'v' THEN '24*7'
    WHEN "8*5" IS NOT NULL AND "8*5" != 'v' THEN "8*5"
    WHEN "24*7" IS NOT NULL AND "24*7" != 'v' THEN "24*7"
    ELSE NULL
END;

ALTER TABLE Contracts
DROP COLUMN "8*5",
DROP COLUMN "24*7";


ALTER TABLE Contracts
ADD COLUMN response_time TEXT;

UPDATE Contracts
SET response_time = CASE
    WHEN "4 hrs" = 'v' THEN '4 hrs'
    WHEN "8 hrs" = 'v' THEN '8 hrs'
    WHEN "4 hrs" IS NOT NULL AND "4 hrs" != 'v' THEN "4 hrs"
    WHEN "8 hrs" IS NOT NULL AND "8 hrs" != 'v' THEN "8 hrs"
    ELSE NULL
END;

ALTER TABLE Contracts
DROP COLUMN "4 hrs",
DROP COLUMN "8 hrs";


ALTER TABLE Contracts
ADD COLUMN service_time TEXT;

UPDATE Contracts
SET service_time = CASE
    WHEN "nbd" = 'v' THEN 'nbd'
    WHEN "48 hrs" = 'v' THEN '48 hrs'
    WHEN "nbd" IS NOT NULL AND "nbd" != 'v' THEN "nbd"
    WHEN "48 hrs" IS NOT NULL AND "48 hrs" != 'v' THEN "48 hrs"
    ELSE NULL
END;

ALTER TABLE Contracts
DROP COLUMN "nbd",
DROP COLUMN "48 hrs";


ALTER TABLE Contracts
ADD COLUMN spare_part_provider TEXT;

UPDATE Contracts
SET spare_part_provider = CASE
    WHEN "client" = 'v' THEN 'client'
    WHEN "cwc" = 'v' THEN 'cwc'
    WHEN "client" IS NOT NULL AND "client" != 'v' THEN "client"
    WHEN "cwc" IS NOT NULL AND "cwc" != 'v' THEN "cwc"
    ELSE NULL
END;

ALTER TABLE Contracts
DROP COLUMN "client",
DROP COLUMN "cwc";


ALTER TABLE Contracts
ADD COLUMN client_id integer;

UPDATE contracts
SET client_id = clients.client_id
FROM clients
WHERE SUBSTRING(contracts.client_code FROM 5 FOR 3) = clients.dedicated_number;

-- manually update client_id which do not have a client_code
select * from Contracts
WHERE client_code is null;
-- e.g.
UPDATE contracts
SET client_id = 'H09'
where contract_id = '1101';

-- u may keep the cusomter
-- if not
ALTER TABLE Contracts
DROP COLUMN "cusomter";

ALTER TABLE Contracts
ADD COLUMN user_id integer;

UPDATE contracts
SET user_id = '1';

ALTER TABLE Contracts
ADD COLUMN project_id integer;

ALTER TABLE Contracts
ADD COLUMN previous_contract TEXT;

-- link forgin key
ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_clients
FOREIGN KEY (client_id)
REFERENCES public.clients (client_id)
ON DELETE RESTRICT;

ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_projects
FOREIGN KEY (project_id)
REFERENCES public.projects (project_id)
ON DELETE RESTRICT;

ALTER TABLE public.contracts
ADD CONSTRAINT fk_contracts_users
FOREIGN KEY (user_id)
REFERENCES public.users (user_id)
ON DELETE RESTRICT;

CREATE TABLE public.maintenance_records (
    maintenance_id SERIAL PRIMARY KEY,
    "Service Date" DATE,
    "Service code" TEXT,
    "Customer" TEXT,
    "Client Code" TEXT,
    "Jobnote" TEXT,
    "Technical Support" TEXT,
    "Maintenance" TEXT,
    "Preventive" TEXT,
    "Installation/ Training" TEXT,
    "Emb" TEXT,
    "Ser" TEXT,
    "DS" TEXT,
    "Sys" TEXT,
    "Other" TEXT,
    "Remote" TEXT,
    "Onsite" TEXT,
    "Hardware" TEXT,
    "Software" TEXT,
    "Location (District)" TEXT,
    "is_Warranty" TEXT,
    "AE" TEXT,
    "Sales" TEXT,
    "Product Model" TEXT,
    "Serial No. (Item No.)" TEXT,
    "Problem Description (Customer Description)" TEXT,
    "Solution (Completed Task)" TEXT,
    "Labor" TEXT,
    "Parts" TEXT,
    "Arrive" TIME WITHOUT TIME ZONE,
    "Depart" TIME WITHOUT TIME ZONE,
    "Completion Date" DATE,
    "Problem Solving Time (By day)" INTEGER,
    "Remark" TEXT,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- pls be careful about multi selection
ALTER TABLE maintenance_records	
ADD COLUMN Service_Type TEXT;
UPDATE maintenance_records
SET Service_Type = CASE
    WHEN "Technical Support" = 'v' THEN 'Technical Support'
    WHEN "Maintenance" = 'v' THEN 'Maintenance'
	WHEN "Preventive" = 'v' THEN 'Preventive'
	WHEN "Installation/ Training" = 'v' THEN 'Installation/ Training'
    ELSE NULL
END;

ALTER TABLE maintenance_records	
DROP COLUMN "Technical Support",
DROP COLUMN "Maintenance",
DROP COLUMN "Preventive",
DROP COLUMN "Installation/ Training";

ALTER TABLE maintenance_records	
ADD COLUMN Product_Type TEXT;
UPDATE maintenance_records
SET Product_Type = CASE
    WHEN "Emb" = 'v' THEN 'Emb'
    WHEN "Ser" = 'v' THEN 'Ser'
	WHEN "DS" = 'v' THEN 'DS'
	WHEN "Sys" = 'v' THEN 'Sys'
	WHEN "Other" = 'v' THEN 'Other'
    ELSE NULL
END;
ALTER TABLE maintenance_records	
DROP COLUMN "Emb",
DROP COLUMN "Ser",
DROP COLUMN "DS",
DROP COLUMN "Sys",
DROP COLUMN "Other";

ALTER TABLE maintenance_records	
ADD COLUMN Support_Method TEXT;
UPDATE maintenance_records
SET Support_Method = CASE
    WHEN "Remote" = 'v' THEN 'Remote'
	WHEN "Onsite" = 'v' THEN 'Onsite'
    ELSE NULL
END;
ALTER TABLE maintenance_records	
DROP COLUMN "Remote",
DROP COLUMN "Onsite";

ALTER TABLE maintenance_records	
ADD COLUMN Symptom_Classification TEXT;
UPDATE maintenance_records
SET Symptom_Classification = CASE
    WHEN "Hardware" = 'v' THEN 'Hardware'
	WHEN "Software" = 'v' THEN 'Software'
    ELSE NULL
END;
ALTER TABLE maintenance_records	
DROP COLUMN "Hardware",
DROP COLUMN "Software";

ALTER TABLE maintenance_records	
RENAME COLUMN "Arrive" TO "Arrive_Time";
ALTER TABLE maintenance_records	
RENAME COLUMN "Depart" TO "Depart_Time";
ALTER TABLE maintenance_records	
RENAME COLUMN "Customer" TO "client";

ALTER TABLE maintenance_records	
DROP COLUMN "Problem Solving Time (By day)";

ALTER TABLE maintenance_records	

ALTER TABLE maintenance_records	
ADD COLUMN "client_id" integer;
ALTER TABLE maintenance_records	
ADD COLUMN "user_id" integer;
ALTER TABLE maintenance_records	
ADD COLUMN "maintenance_status" TEXT;
ALTER TABLE maintenance_records	
ADD COLUMN "alias" TEXT;

UPDATE public.maintenance_records
SET alias = client

UPDATE public.maintenance_records
SET user_id = '1'

UPDATE public.maintenance_records
SET client_id = clients.client_id
FROM public.clients
WHERE
public.maintenance_records."Client Code" IS NOT NULL
AND SUBSTRING(public.maintenance_records."Client Code" FROM 5 FOR 3) = clients.dedicated_number;

UPDATE public.maintenance_records
SET client_id = clients.client_id
FROM public.clients
WHERE
public.maintenance_records.client_id IS NULL
AND public.maintenance_records.client = clients.client_name;

-- then manually update client_id which do not have a client_code
select maintenance_id, client, alias, "Client Code", client_id from maintenance_records where client_id is null


ALTER TABLE public.maintenance_records
ADD CONSTRAINT fk_maintenance_records_clients FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE SET NULL;

ALTER TABLE public.maintenance_records
ADD CONSTRAINT fk_maintenance_records_users FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;

-- better name

ALTER TABLE public.maintenance_records
RENAME COLUMN "Service Date" TO service_date;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Service code" TO service_code;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Client Code" TO client_code;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Jobnote" TO jobnote;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Location (District)" TO location_district;

ALTER TABLE public.maintenance_records
RENAME COLUMN "is_Warranty" TO is_warranty;

ALTER TABLE public.maintenance_records
ALTER COLUMN is_warranty TYPE BOOLEAN
USING CASE
  WHEN is_warranty = 'Y' THEN TRUE
  ELSE FALSE
END;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Product Model" TO product_model;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Serial No. (Item No.)" TO serial_no;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Problem Description (Customer Description)" TO problem_description;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Solution (Completed Task)" TO solution_details;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Labor" TO labor_details;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Parts" TO parts_details;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Arrive_Time" TO arrive_time;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Depart_Time" TO depart_time;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Completion Date" TO completion_date;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Remark" TO remark;

ALTER TABLE public.maintenance_records
RENAME COLUMN "AE" TO ae;

ALTER TABLE public.maintenance_records
RENAME COLUMN "Sales" TO sales;


-- Maintenance Request PICs table: Stores the users assigned as PICs for each maintenance request
CREATE TABLE public.maintenance_request_pics (
    id SERIAL PRIMARY KEY,
    
    -- Foreign key to the maintenance_records table
    -- ON DELETE CASCADE means if a maintenance record is deleted,
    -- all its related PIC entries in this table will be automatically removed.
    maintenance_request_id INTEGER NOT NULL REFERENCES public.maintenance_records(maintenance_id) ON DELETE CASCADE,
    
    -- Foreign key to the users table
    pic_user_id INTEGER NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,

    -- Ensures that the same user cannot be assigned as a PIC to the same request more than once
    UNIQUE (maintenance_request_id, pic_user_id)
);

-- Actually we dont allow repeated name
ALTER TABLE public.users
ADD CONSTRAINT users_username_key UNIQUE (username);

-- Manual modify maintenance_records
-- ensure use /, first letter is capital, wrong name

-- set up account for ae, later for sales
WITH distinct_ae_names AS (
  SELECT DISTINCT ae
  FROM public.maintenance_records
  WHERE ae IS NOT NULL AND ae != ''
),
all_individual_names AS (
  SELECT DISTINCT trim(unnest(string_to_array(ae, '/'))) AS username
  FROM distinct_ae_names
)
INSERT INTO public.users (username, email, password_hash, role)
SELECT
  username,
  lower(username) || '@systrack.com' AS email,
  -- IMPORTANT: placeholder.
  'a_very_secure_placeholder_password_hash' AS password_hash,
  'AE' AS role
FROM all_individual_names
ON CONFLICT (username) DO NOTHING;



WITH maintenance_with_individual_aes AS (
  -- Step 1: For each maintenance record, create a row for each AE name.
  SELECT
    mr.maintenance_id,
    trim(unnest(string_to_array(mr.ae, '/'))) AS ae_username
  FROM public.maintenance_records mr
  WHERE mr.ae IS NOT NULL AND mr.ae != ''
)
-- Step 2: Insert into the junction table by joining with the users table
-- to get the correct user_id for each AE name.
INSERT INTO public.maintenance_request_pics (maintenance_request_id, pic_user_id)
SELECT
  m.maintenance_id,
  u.user_id
FROM maintenance_with_individual_aes m
-- Join with the users table to find the user_id for each username
JOIN public.users u ON m.ae_username = u.username
-- This is a safety check to prevent inserting duplicate entries if the script is run multiple times.
ON CONFLICT (maintenance_request_id, pic_user_id) DO NOTHING;



SELECT DISTINCT category
FROM contracts
WHERE category IS NOT NULL;

UPDATE contracts
SET category = 'DSS'
WHERE lower(category) IN ('ds', 'dss');

UPDATE contracts
SET category = 'SVR'
WHERE lower(category) IN ('svr');

UPDATE contracts
SET category = 'EMB'
WHERE lower(category) IN ('em');

-- Create a new table for pending registrations
CREATE TABLE pending_registrations (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'sales', 'ae')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending'  -- 'pending', 'approved', 'rejected'
);

-- create index

CREATE INDEX idx_contracts_client_id ON public.contracts (client_id);
CREATE INDEX idx_contracts_project_id ON public.contracts (project_id);
CREATE INDEX idx_contracts_user_id ON public.contracts (user_id);
CREATE INDEX idx_projects_client_id ON public.projects (client_id);
CREATE INDEX idx_contracts_category ON public.contracts (category);
CREATE INDEX idx_clients_client_name ON public.clients (client_name);
CREATE INDEX idx_users_username ON public.users (username);
CREATE INDEX idx_maintenance_records_client_id ON public.maintenance_records (client_id);
CREATE INDEX idx_maintenance_records_user_id ON public.maintenance_records (user_id);
CREATE INDEX idx_maintenance_records_ae ON public.maintenance_records ("AE");CREATE INDEX idx_maintenance_records_status ON public.maintenance_records (maintenance_status);

