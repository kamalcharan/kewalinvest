// test-explicit.js
const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',  // Try explicit localhost IP
  port: 5432,
  user: 'kewal_admin',
  password: 'kewal_secure_pass_2024',
  database: 'kewalinvest'
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error:', err.message);
  } else {
    console.log('SUCCESS!', res.rows[0]);
  }
  pool.end();
});