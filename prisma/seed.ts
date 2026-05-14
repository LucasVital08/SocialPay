/**
 * Seed script for SocialPay — creates demo users with Stellar Testnet wallets.
 * WARNING: Secret keys stored in plaintext for TESTNET/development only.
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import * as StellarSdk from "@stellar/stellar-sdk";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
const dbPath = dbUrl.replace(/^file:/, "");
const resolvedPath = path.isAbsolute(dbPath)
  ? dbPath
  : path.resolve(process.cwd(), dbPath);

const adapter = new PrismaBetterSqlite3({ url: resolvedPath });
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);

const DEMO_PASSWORD = "demo123456";

const SEED_USERS = [
  {
    name: "Lucas Monteiro",
    email: "lucas@socialpay.test",
    handle: "lucas",
    accountType: "person",
  },
  {
    name: "Gabriel Silva",
    email: "gabriel@socialpay.test",
    handle: "gabriel",
    accountType: "person",
  },
  {
    name: "AKS Enterprise",
    email: "contato@aks.test",
    handle: "aksenterprise",
    accountType: "company",
  },
  {
    name: "Obra Shopping Vitória",
    email: "obra@aks.test",
    handle: "obra-shopping-vitoria",
    accountType: "project",
  },
];

async function fundAccount(publicKey: string): Promise<boolean> {
  try {
    const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log("🌱 Iniciando seed do SocialPay...\n");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const userData of SEED_USERS) {
    const existing = await prisma.user.findUnique({
      where: { handle: userData.handle },
      include: { wallet: true },
    });

    if (existing) {
      console.log(`⏭️  @${userData.handle} já existe, pulando.`);
      continue;
    }

    const keypair = StellarSdk.Keypair.random();
    const publicKey = keypair.publicKey();
    const secretKey = keypair.secret();

    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        handle: userData.handle,
        accountType: userData.accountType,
        wallet: {
          create: {
            publicKey,
            encryptedSecret: secretKey,
            network: "testnet",
          },
        },
      },
    });

    console.log(`✅ @${user.handle} (${user.name}) criado`);
    console.log(`   Public Key: ${publicKey}`);

    const funded = await fundAccount(publicKey);
    if (funded) {
      await prisma.wallet.update({
        where: { userId: user.id },
        data: { funded: true },
      });
      console.log(`   💰 Carteira financiada via Friendbot`);
    } else {
      console.log(`   ⚠️  Friendbot falhou (pode tentar via interface /demo)`);
    }

    console.log();
  }

  console.log("✅ Seed concluído!");
  console.log("\nUsuários demo criados:");
  console.log("  @lucas    → lucas@socialpay.test / demo123456");
  console.log("  @gabriel  → gabriel@socialpay.test / demo123456");
  console.log("  @aksenterprise → contato@aks.test / demo123456");
  console.log("  @obra-shopping-vitoria → obra@aks.test / demo123456");
  console.log("\nAcesse /demo para testar a transação entre @lucas e @gabriel.");
}

main()
  .catch((e) => {
    console.error("❌ Seed falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
