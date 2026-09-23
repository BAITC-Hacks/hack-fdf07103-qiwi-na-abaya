import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Opening SQLite creates a missing database without touching existing data.
// This also avoids Prisma CLI's Windows error for a nonexistent database file.
const db = new PrismaClient();
db.$connect()
  .then(() => console.log("SQLite готова к миграциям."))
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
