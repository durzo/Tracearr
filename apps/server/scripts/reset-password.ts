#!/usr/bin/env tsx
/**
 * Emergency Owner Password Reset Script
 *
 * This script resets the password for the owner user account.
 * It requires direct Docker/server access and is intended for emergency recovery.
 *
 * Usage:
 *   Interactive (prompts for password):
 *     docker exec -it tracearr node apps/server/scripts/reset-password.ts
 *
 *   With password argument (for automation):
 *     docker exec tracearr node apps/server/scripts/reset-password.ts "newPassword123"
 *
 *   Local development (via pnpm):
 *     pnpm reset-password
 *
 * Requirements:
 *   - Must have an owner user with a password_hash (local auth enabled)
 *   - If owner only uses external auth (Plex/Jellyfin), this script will fail
 *
 * Owner Selection:
 *   First user (by created_at) with role='owner', then validates password_hash exists
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import readline from 'readline';

// Load environment variables if DATABASE_URL is not already set
// in docker, we may have env variables set directly or via a .env file
// in proxmox lxc, we rely on a .env file at /data/tracearr/.env
// there may be other methods we need to support in the future
if (!process.env.DATABASE_URL) {
  const envPaths = [
    resolve(import.meta.dirname, '../../../.env'), // docker and dev
    '/data/tracearr/.env', // proxmox lxc
  ];

  let loaded = false;
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      dotenv.config({ path: envPath, quiet: true });
      if (process.env.DATABASE_URL) {
        loaded = true;
        break;
      }
    }
  }

  if (!loaded) {
    console.error('ERROR: DATABASE_URL environment variable not found.\n');
    console.error('Tried loading from:');
    for (const path of envPaths) {
      console.error(`  • ${path}`);
    }
    console.error('\nPlease ensure DATABASE_URL is set or one of these files exists.\n');
    process.exit(1);
  }
}

// Determine if we're in development (src files) or production (dist files)
// this is just so we dont have to build the project for testing the scripts
// or add extra copy steps to the Dockerfile. KISS.
const srcPath = resolve(import.meta.dirname, '../src/db/client.ts');
const useSrc = existsSync(srcPath);
const basePath = useSrc ? '../src' : '../dist';

// Import database modules after environment is loaded
const { db, closeDatabase } = await import(`${basePath}/db/client.js`);
const { users } = await import(`${basePath}/db/schema.js`);
const { hashPassword } = await import(`${basePath}/utils/password.js`);
const { eq, asc } = await import('drizzle-orm');

/**
 * Main execution function
 */
async function main() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  Tracearr Emergency Password Reset');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Find owner user (first user by created_at with role='owner')

    const [owner] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        passwordHash: users.passwordHash,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, 'owner'))
      .orderBy(asc(users.createdAt))
      .limit(1);

    // Handle: No owner user exists at all
    if (!owner) {
      console.error('ERROR: No owner user found in the database.\n');
      console.error('This should not happen in a properly initialized Tracearr instance.');
      console.error('Please ensure you have completed the initial setup.\n');
      await closeDatabase();
      process.exit(1);
    }

    // Handle: Owner exists but has no password (external auth only)
    if (!owner.passwordHash) {
      console.error('ERROR: Owner user has no password authentication enabled.\n');
      console.error('This script cannot be used.\n');
      await closeDatabase();
      process.exit(1);
    }

    // Display found owner
    console.log('Found owner user:');
    console.log(`   Username: ${owner.username}`);
    console.log(`   Email:    ${owner.email || '(not set)'}\n`);

    // Get password from CLI argument or prompt interactively
    let password: string;

    if (process.argv[2]) {
      // Password provided as CLI argument
      password = process.argv[2];
    } else {
      // Prompt interactively
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      password = await new Promise<string>((resolve) => {
        rl.question('Enter new password: ', (answer) => {
          resolve(answer);
        });
      });

      rl.close();
    }

    // Validate password length
    if (password.length < 8) {
      console.error('\nERROR: Password must be at least 8 characters long.');
      await closeDatabase();
      process.exit(1);
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update the database
    await db
      .update(users)
      .set({
        passwordHash,
      })
      .where(eq(users.id, owner.id));

    // Success!
    console.log('\nPassword reset successfully!\n');

    // Close database connection
    await closeDatabase();
  } catch (error) {
    console.error('\nERROR: An error occurred during password reset:\n');
    if (error instanceof Error) {
      console.error(`   ${error.message}\n`);
      if (process.env.DEBUG) {
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('   Unknown error occurred');
    }

    // Close database connection before exit
    await closeDatabase();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nFatal error:', error);
  process.exit(1);
});
