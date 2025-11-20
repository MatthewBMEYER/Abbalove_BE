// utils/dateUtils.js

/**
 * Convert ISO date string to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
 * @param {string|Date} date - ISO string or Date object
 * @returns {string} MySQL formatted datetime string
 */
const formatDateForMySQL = (date) => {
    const d = new Date(date);
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Convert MySQL DATETIME to ISO string for frontend
 * @param {string} mysqlDate - MySQL DATETIME string (YYYY-MM-DD HH:MM:SS)
 * @returns {string} ISO string
 */
const formatMySQLToISO = (mysqlDate) => {
    if (!mysqlDate) return null;
    return new Date(mysqlDate).toISOString();
};

/**
 * Get current date in MySQL format
 * @returns {string} Current datetime in MySQL format
 */
const getCurrentMySQLDateTime = () => {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
};

module.exports = {
    formatDateForMySQL,
    formatMySQLToISO,
    getCurrentMySQLDateTime
};