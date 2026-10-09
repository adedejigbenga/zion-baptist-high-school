/**
 * Creates ONE account (ADMIN by default; set ACCOUNT_ROLE=TEACHER or STUDENT) on a (hosted) database. This is the safe way to bootstrap a real or preview
 * deployment: it never loads demo data and never uses the shared development password.
 *
 *   ADMIN_LOGIN_ID=admin ADMIN_PASSWORD='<your own, 12+ characters>' npx tsx prisma/create-admin.ts
 *
 * It refuses to touch an existing account, so it cannot be used to reset someone's password. The password comes only
 * from the environment (never from a file in the repo) and is stored as an Argon2id hash.
 */
import { hash } from "@node-rs/argon2"
import { PrismaPg } from "@prisma/adapter-pg"

import { PrismaClient, Role } from "../src/generated/prisma/client"

try {
  process.loadEnvFile(".env.local")
} catch {
  // DATABASE_URL may already be set in the environment.
}

const loginId = process.env.ADMIN_LOGIN_ID?.trim()
const password = process.env.ADMIN_PASSWORD ?? ""
const accountRole = (process.env.ACCOUNT_ROLE ?? "ADMIN").toUpperCase()
if (!["ADMIN", "TEACHER", "STUDENT"].includes(accountRole)) throw new Error("ACCOUNT_ROLE must be ADMIN, TEACHER or STUDENT.")
const firstName = process.env.ADMIN_FIRST_NAME?.trim() || "School"
const lastName = process.env.ADMIN_LAST_NAME?.trim() || "Administrator"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.")
if (!loginId) throw new Error("ADMIN_LOGIN_ID is required.")
if (password.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.")
if (password === "ZionDemo#2026") throw new Error("ADMIN_PASSWORD must not be the shared development password.")

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

async function main() {
  const existing = await prisma.user.findUnique({ where: { loginId } })
  if (existing) throw new Error(`An account with login ID "${loginId}" already exists. Nothing was changed.`)

  const passwordHash = await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 })
  const user = await prisma.user.create({
    data: { loginId: loginId!, passwordHash, role: Role[accountRole as keyof typeof Role], firstName, lastName, isActive: true },
  })
  if (accountRole === "ADMIN") await prisma.admin.create({ data: { userId: user.id } })
  if (accountRole === "TEACHER") await prisma.teacher.create({ data: { userId: user.id, employeeNumber: loginId! } })
  if (accountRole === "STUDENT") await prisma.student.create({ data: { userId: user.id, admissionNumber: loginId! } })
  console.log(`Created ${accountRole.toLowerCase()} account "${loginId}".`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
