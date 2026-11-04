/**
 * Create the first administrator (production bootstrap).
 *
 * The admin is created as "invited": no password is set here. The script prints
 * the invite link (and sends it by email/WhatsApp when those are configured);
 * opening it lets the admin choose their own password.
 *
 * Usage (email and/or phone; run with FRONTEND_URL set to the real site, the link uses it):
 *   npm run create-admin -- --first Ana --last Machava --email ana@example.co.mz [--phone 841234567] [--whatsapp]
 *
 * --whatsapp records that the person agreed to WhatsApp messages, so the invite also goes by WhatsApp.
 */
import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../src/config/database';
import User from '../src/models/User';
import { UserService } from '../src/services/userService';
import { identifierFilter } from '../src/services/authService';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const email = arg('email');
  const firstName = arg('first');
  const lastName = arg('last');
  const phone = arg('phone');
  const whatsappOptIn = process.argv.includes('--whatsapp');

  if ((!email && !phone) || !firstName || !lastName) {
    console.error('Usage: npm run create-admin -- --first <first name> --last <last name> --email <email> [--phone <phone>] [--whatsapp]');
    console.error('       (an email, a phone number, or both)');
    process.exit(1);
  }

  await connectDB();
  try {
    for (const identifier of [email, phone]) {
      const filter = identifier ? identifierFilter(identifier) : null;
      const existing = filter ? await User.findOne(filter) : null;
      if (existing) {
        console.error(`A user with ${identifier} already exists (role: ${existing.role}, status: ${existing.status}).`);
        process.exitCode = 1;
        return;
      }
    }

    const { user, inviteLink, delivery } = await UserService.createInvited(
      { firstName, lastName, email, phone, role: 'administrador', whatsappOptIn }
    );

    console.log(`✅ Administrator ${user.fullName} <${user.email || user.phone}> created (status: invited).`);
    console.log(`🔗 Invite link (valid 7 days): ${inviteLink}`);
    console.log(`   Sent by email: ${delivery.email ? 'yes' : 'no'} · by WhatsApp: ${delivery.whatsapp ? 'yes' : 'no'}`);
  } finally {
    await disconnectDB();
  }
}

main().catch((error) => {
  console.error('❌ Failed to create administrator:', error);
  process.exit(1);
});
