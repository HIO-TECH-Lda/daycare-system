/**
 * Create the first administrator (production bootstrap).
 *
 * The admin is created as "invited": no password is set here. The script prints
 * the invite link (and sends it by email/WhatsApp when those are configured);
 * opening it lets the admin choose their own password.
 *
 * Usage:
 *   npm run create-admin -- --email ana@example.co.mz --first Ana --last Machava [--phone 841234567]
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../src/config/database';
import User from '../src/models/User';
import { UserService } from '../src/services/userService';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const email = arg('email');
  const firstName = arg('first');
  const lastName = arg('last');
  const phone = arg('phone');

  if (!email || !firstName || !lastName) {
    console.error('Usage: npm run create-admin -- --email <email> --first <first name> --last <last name> [--phone <phone>]');
    process.exit(1);
  }

  await connectDB();
  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      console.error(`A user with email ${email} already exists (role: ${existing.role}, status: ${existing.status}).`);
      process.exitCode = 1;
      return;
    }

    const { user, inviteLink } = await UserService.createInvited({ firstName, lastName, email, phone, role: 'administrador' });

    console.log(`✅ Administrator ${user.fullName} <${user.email}> created (status: invited).`);
    console.log(`🔗 Invite link (valid 7 days): ${inviteLink}`);
  } finally {
    await disconnectDB();
  }
}

main().catch((error) => {
  console.error('❌ Failed to create administrator:', error);
  process.exit(1);
});
