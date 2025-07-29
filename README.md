# SysTrack: Client and Contract Management System

SysTrack is a full-stack web application designed to replace manual Excel-based workflows with a robust and user-friendly platform. Built with a React frontend and a Node.js/Express backend, it offers a centralized system for sales and account executive teams to manage clients, contracts, and projects efficiently.

The application features automated code generation, advanced search and filtering, dynamic data calculations, and an integrated email notification system for expiring contracts.

## Key Features

-   **Dashboard**: Provides a high-level overview of total clients, total contracts, and contracts that are expiring soon.
-   **Client Management**:
    -   Full CRUD (Create, Read, Update, Delete) operations for clients.
    -   Simplified client creation requiring only a name and an optional email.
    -   **Auto-Generated Dedicated Numbers**: Unique client codes (e.g., `A01`, `X02`) are automatically generated based on the client's name.
    -   **Dynamic Counts**: Order and renewal counts are calculated dynamically from the contracts table, ensuring data is always up-to-date.
-   **Contract Management**:
    -   Full CRUD operations for contracts.
    -   **Searchable Dropdowns**: `AsyncSelect` components allow for efficient, backend-powered searching of clients and projects when creating or editing contracts.
    -   **Multi-Field Search**: A single search bar allows users to search across Contract Name, Client, Job Note, and Location simultaneously.
    -   **Default SLA Pre-filling**: New contracts are automatically pre-filled with standard SLA values (`8x5` Period, `4hr` Response, `NBD` Service Time) to speed up data entry.
-   **Renewal Notification System**:
    -   A dedicated review page allows users to see all expiring contracts and pre-selects un-renewed ones for action.
    -   Users can uncheck contracts to exclude them from the notification.
    -   An **Email Preview Modal** shows the exact email content before sending.
    -   Sends a professionally formatted email with a dynamic subject line to the sales team via Nodemailer.
-   **Robust Authentication & Session Management**:
    -   Secure user login and registration using JWT (JSON Web Tokens).
    -   **Inactivity Timeout**: Users are automatically logged out after 15 minutes of inactivity for enhanced security.
    -   **Sliding Sessions**: Active users remain logged in indefinitely thanks to a seamless, automatic token refresh mechanism.

## Tech Stack

-   **Frontend**: React.js, React Router, Bootstrap, Axios, `react-select`, `jwt-decode`, `lodash.debounce`
-   **Backend**: Node.js, Express.js, PostgreSQL, `pg` (node-postgres)
-   **Authentication**: `jsonwebtoken`, `bcrypt`
-   **Email**: `nodemailer`
-   **Testing**: `jest`, `supertest`
-   **Deployment**: Nginx (as reverse proxy), PM2 (as process manager)

## Setup Instructions

Follow these steps to set up and run the project on a local machine for development.

### Prerequisites

-   Node.js (v18.x or later)
-   npm
-   PostgreSQL

### 1. Backend Setup

First, set up the Node.js server and connect it to the database.

1.  **Navigate to the backend directory:**
    ```
    cd backend
    ```

2.  **Install dependencies:**
    ```
    npm install
    ```

3.  **Set up the Database:**
    -   Log in to PostgreSQL and create a new database and user.
        ```
        CREATE DATABASE systrack_dev;
        CREATE USER systrack_user WITH ENCRYPTED PASSWORD 'your_secure_password';
        GRANT ALL PRIVILEGES ON DATABASE systrack_dev TO systrack_user;
        ```
    -   Run your database schema script (`db-setup.sql` or similar) to create the necessary tables.

4.  **Create the Backend Environment File (`.env`):**
    -   Create a file named `.env` in the `backend` directory.
    -   Add the following variables, replacing the placeholder values with your actual credentials.

    ```
    # Database Connection
    DATABASE_URL=postgresql://systrack_user:your_secure_password@localhost:5432/systrack_dev

    # JWT Secret Key
    JWT_SECRET=a_very_strong_and_random_secret_key_for_jwt

    # Email Notification Credentials (using a Gmail App Password is recommended)
    EMAIL_USER=your-dedicated-app-email@gmail.com
    EMAIL_PASS=your-16-digit-gmail-app-password
    RECIPIENT_EMAIL=email_address_to_receive_notifications@example.com
    ```

5.  **Start the Backend Server:**
    ```
    npm start
    ```
    The backend will be running on `http://localhost:3000`.

### 2. Frontend Setup

Next, set up the React client.

1.  **Navigate to the frontend directory:**
    ```
    cd frontend
    ```

2.  **Install dependencies:**
    ```
    npm install
    ```

3.  **Create the Frontend Environment File (`.env`):**
    -   This step is crucial for defining where the frontend should send its API requests.
    -   Create a file named `.env` in the `frontend` directory.
    -   Add the following variable. For local development, it should point to your local backend server.

    ```
    # The URL for the backend API. React requires the 'REACT_APP_' prefix.
    REACT_APP_API_URL=http://localhost:3000/api
    ```
    *Note: When deploying to a VM, you would change this URL to the server's public address, e.g., `http://192.168.1.100/api`.*

4.  **Start the Frontend Development Server:**
    ```
    npm start
    ```
    The frontend will open and run on `http://localhost:3001`.

## Running Tests

Unit and integration tests for the backend are located in the `backend` directory and can be run using Jest.

1.  **Navigate to the backend directory:**
    ```
    cd backend
    ```
2.  **Run the test suite:**
    ```
    npm test
    ```