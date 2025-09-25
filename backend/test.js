const { Pool } = require('pg');

// Test with the exact connection string
const pool = new Pool({
  connectionString: 'postgresql://kewal_admin:test123@localhost:5432/kewalinvest'
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Success:', res.rows[0]);
  }
  pool.end();
});