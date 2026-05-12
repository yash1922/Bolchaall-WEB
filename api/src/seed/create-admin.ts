import "dotenv/config";
import { connectDB, disconnectDB } from "../lib/db";
import { hashPassword } from "../auth/passwords";
import { User } from "../models/User";

async function run() {
  const [, , email, name, password] = process.argv;
  if (!email || !name || !password) {
    console.error("Usage: pnpm create-admin <email> <name> <password>");
    process.exit(2);
  }
  await connectDB();
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`User ${email} already exists.`);
    await disconnectDB();
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  const u = await User.create({
    email: email.toLowerCase(),
    name,
    role: "admin",
    passwordHash,
  });
  console.log(`Admin created: ${u.email} (${u.id})`);
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error("create-admin failed:", err);
  process.exit(1);
});
