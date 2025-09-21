/**
 * Add Password Support to Existing Users
 * This script adds password hashes to our real users without requiring migration
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient();

// Password for all users in the 2025 NFL Season Week 3 league
const LEAGUE_PASSWORD = 'player123!';

async function addPasswordsToUsers() {
  console.log('🔐 Adding password support to existing users...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users to update`);

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(LEAGUE_PASSWORD, saltRounds);
    console.log('✅ Password hashed successfully');

    // Update each user with the hashed password
    let updated = 0;
    for (const user of users) {
      try {
        // Check if user model supports password field
        await prisma.$executeRaw`
          UPDATE users 
          SET password = ${hashedPassword}
          WHERE id = ${user.id}
        `;
        
        console.log(`✅ Updated password for: ${user.name} (${user.email})`);
        updated++;
      } catch (error: any) {
        if (error.message.includes('column "password" of relation "users" does not exist')) {
          console.log('❌ Password column does not exist in database. Adding it...');
          
          // Add password column directly to database
          await prisma.$executeRaw`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS password VARCHAR(255)
          `;
          
          console.log('✅ Password column added to database');
          
          // Retry updating the user
          await prisma.$executeRaw`
            UPDATE users 
            SET password = ${hashedPassword}
            WHERE id = ${user.id}
          `;
          
          console.log(`✅ Updated password for: ${user.name} (${user.email})`);
          updated++;
        } else {
          console.error(`❌ Error updating ${user.name}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Password update complete!`);
    console.log(`✅ Updated: ${updated} users`);
    console.log(`🔑 Password: ${LEAGUE_PASSWORD}`);
    console.log(`🏈 Ready for 2025 NFL Season Week 3 authentication!`);

  } catch (error) {
    console.error('❌ Error adding passwords:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  addPasswordsToUsers();
}

export { addPasswordsToUsers };