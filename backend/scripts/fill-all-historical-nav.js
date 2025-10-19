// scripts/fill-all-historical-nav-interactive.js
const { Pool } = require('pg');
const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🚀 BULK HISTORICAL NAV DOWNLOAD\n');
  
  // Get database credentials
  const dbHost = await question('Database Host (default: localhost): ') || 'localhost';
  const dbPort = await question('Database Port (default: 5432): ') || '5432';
  const dbName = await question('Database Name: ');
  const dbUser = await question('Database User: ');
  const dbPassword = await question('Database Password: ');
  const apiPort = await question('API Port (default: 8080): ') || '8080';
  
  rl.close();
  
  console.log('\n📡 Connecting to database...\n');
  
  const pool = new Pool({
    host: dbHost,
    port: parseInt(dbPort),
    database: dbName,
    user: dbUser,
    password: dbPassword
  });

  const client = await pool.connect();
  
  try {
    // Get all bookmarked schemes
    const query = `
      SELECT 
        sb.scheme_id,
        sb.scheme_code,
        sb.scheme_name,
        sb.tenant_id,
        sb.is_live,
        COALESCE(sd.launch_date, CURRENT_DATE - INTERVAL '20 years') as start_date
      FROM t_scheme_bookmarks sb
      JOIN t_scheme_details sd ON sb.scheme_id = sd.id
      WHERE sb.is_active = true
      ORDER BY sb.scheme_code;
    `;
    
    const result = await client.query(query);
    console.log(`\n📊 Found ${result.rows.length} bookmarked schemes\n`);
    
    if (result.rows.length === 0) {
      console.log('No bookmarks found!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const row of result.rows) {
      console.log(`\n📦 ${row.scheme_name} (${row.scheme_code})`);
      
      const startDate = new Date(row.start_date).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      console.log(`   📅 ${startDate} → ${endDate}`);
      
      try {
        const response = await axios.post(
          `http://localhost:${apiPort}/api/nav/downloads/historical`,
          {
            scheme_ids: [row.scheme_id],
            start_date: startDate,
            end_date: endDate
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': row.tenant_id.toString(),
              'x-environment': row.is_live ? 'live' : 'test'
            }
          }
        );

        if (response.data.success) {
          console.log(`   ✅ Job ID: ${response.data.data.job_id}`);
          successCount++;
        } else {
          console.log(`   ❌ ${response.data.error}`);
          errorCount++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`   ❌ ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');
    
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);