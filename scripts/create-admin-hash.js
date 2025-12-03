const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Password: admin123');
    console.log('Hash:', hash);
    console.log('\nSQL to create admin user:\n');
    console.log(`INSERT INTO users (tenant_id, email, password_hash, role, created_at)`);
    console.log(`VALUES (`);
    console.log(`    1,  -- Replace with your tenant_id`);
    console.log(`    'admin@example.com',  -- Change to your email`);
    console.log(`    '${hash}',`);
    console.log(`    'SYSTEM_ADMIN',`);
    console.log(`    NOW()`);
    console.log(`);`);
}

generateHash();
