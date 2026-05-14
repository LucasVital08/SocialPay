import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createKeypair } from "@/lib/stellar.service";
import bcrypt from "bcryptjs";

const DEMO_USERS = [
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
];

export async function POST() {
  try {
    const results = [];

    for (const demo of DEMO_USERS) {
      let user = await prisma.user.findUnique({
        where: { handle: demo.handle },
        include: { wallet: true },
      });

      if (!user) {
        const passwordHash = await bcrypt.hash("demo123456", 10);
        const keypair = createKeypair();

        user = await prisma.user.create({
          data: {
            name: demo.name,
            email: demo.email,
            passwordHash,
            handle: demo.handle,
            accountType: demo.accountType,
            wallet: {
              create: {
                publicKey: keypair.publicKey,
                encryptedSecret: keypair.secretKey,
                network: "testnet",
              },
            },
          },
          include: { wallet: true },
        });
      }

      results.push({
        handle: user.handle,
        name: user.name,
        publicKey: user.wallet?.publicKey,
        funded: user.wallet?.funded,
      });
    }

    return NextResponse.json({ ok: true, users: results });
  } catch (err) {
    console.error("[demo/setup]", err);
    return NextResponse.json({ error: "Erro ao criar usuários demo" }, { status: 500 });
  }
}
