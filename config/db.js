// config/db.js
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Create the connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test function that will be automatically called when this module is required
async function testConnection() {
    let connection;
    try {
        console.log('Testing database connection...');

        // 1. Test basic connection
        connection = await pool.getConnection();
        console.log('✓ Connected to database server');

        // 2. Test simple query
        const [rows] = await connection.query('SELECT 1 + 1 AS solution');
        console.log(`✓ Basic query test passed: 1 + 1 = ${rows[0].solution}`);

        // 3. Test user table access
        try {
            const [users] = await connection.query('SELECT 1 FROM user LIMIT 1');
            console.log('✓ User table exists and is accessible');
        } catch (err) {
            console.error('✗ User table access failed:', err.message);
            console.error('Please verify:');
            console.error('- The "user" table exists in your database');
            console.error('- Your DB user has proper permissions');
        }

        // 4. Test insert operation (if user table exists)
        const testEmail = `test_${uuidv4()}@test.com`;
        try {
            await connection.query(
                'INSERT INTO user (id, email, password, first_name, last_name, role_id) VALUES (?, ?, ?, ?, ?, ?)',
                [uuidv4(), testEmail, 'test123', 'Test', 'User', '4']
            );
            console.log('✓ Insert test completed successfully');

            // Clean up
            await connection.query('DELETE FROM user WHERE email = ?', [testEmail]);
        } catch (err) {
            console.error('✗ Insert test failed:', err.message);
            console.error('Please verify:');
            console.error('- The "user" table structure matches your queries');
            console.error('- All required columns exist');
        }

    } catch (err) {
        console.error('Database connection failed:', err.message);
        console.error('Please verify:');
        console.error('- Database server is running');
        console.error('- Connection credentials in .env are correct');
        console.error('- Network connectivity to database host');
        process.exit(1); // Exit with error code if connection fails
    } finally {
        if (connection) connection.release();
    }
}

testConnection();

module.exports = pool;