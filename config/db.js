/**
 * db.js - Database configuration and connection management
 *
 * This module sets up and manages the MySQL database connection pool.
 * It provides functionality for executing database queries with proper error handling.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * Database configuration settings
 * Values are loaded from environment variables with sensible defaults
 */
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'profocus',
    // Connection pool settings
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
    queueLimit: 0,
    // Connection management
    enableKeepAlive: true,
    keepAliveInitialDelay: 30000, // 30 seconds
    // Timeout settings
    connectTimeout: 10000, // 10 seconds
    // Character encoding
    charset: 'utf8mb4'
};

/**
 * Create a MySQL connection pool
 * Using a pool improves performance by reusing connections
 */
const pool = mysql.createPool(dbConfig);

/**
 * Test database connection on startup
 * This immediately verifies that the database is accessible
 */
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');

        // Get server version for diagnostics
        const [rows] = await connection.query('SELECT VERSION() as version');
        console.log(`   MySQL Server Version: ${rows[0].version}`);
        console.log(`   Database: ${dbConfig.database}`);

        connection.release();
    } catch (err) {
        console.error('❌ Database connection error:', err);
        console.error('Please check your database settings in .env file and ensure MySQL server is running.');

        // Additional diagnostic information
        console.error(`Attempted to connect to: ${dbConfig.host}:${dbConfig.database} as ${dbConfig.user}`);

        // Provide guidance if common errors are detected
        if (err.code === 'ECONNREFUSED') {
            console.error('   - Make sure MySQL server is running on the specified host and port');
        } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   - Check your database username and password in the .env file');
        } else if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('   - The database does not exist. Run the SQL script to create it:');
            console.error('     mysql -u [username] -p < .sql');
        }
    }
})();

/**
 * Execute a SQL query with proper error handling
 *
 * @param {string} sql - The SQL query to execute
 * @param {Array} params - Parameters to use in the prepared statement
 * @returns {Promise<Array>} - Results from the query
 * @throws {Error} - If query execution fails
 */
pool.executeQuery = async (sql, params = []) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [result] = await connection.query(sql, params);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        console.error('Query:', sql);
        console.error('Parameters:', JSON.stringify(params, null, 2));
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Execute a transaction with multiple queries
 *
 * @param {Function} callback - Async function that receives a connection and executes queries
 * @returns {Promise<any>} - Result from the transaction
 * @throws {Error} - If transaction fails
 */
pool.executeTransaction = async (callback) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const result = await callback(connection);

        await connection.commit();
        return result;
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Transaction error:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Get a raw connection from the pool
 * Use this when you need a dedicated connection for multiple operations
 * Important: Always release the connection when done
 *
 * @returns {Promise<Connection>} - Database connection
 */
pool.getPoolConnection = async () => {
    return await pool.getConnection();
};

module.exports = pool;