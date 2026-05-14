import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import {
  createKeypair,
  fundTestnetAccount,
} from "@/lib/stellar.service";
import { normalizeHandle, validateHandle } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  handle: z.string().min(3).max(30),
  accountType: z
    .enum(["person", "company", "project", "supplier"])
    .default("person"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const normalizedHandle = normalizeHandle(data.handle);
    const handleError = validateHandle(normalizedHandle);
    if (handleError) {
      return NextResponse.json({ error: handleError }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { handle: normalizedHandle }],
      },
    });

    if (existing) {
      const field = existing.email === data.email ? "e-mail" : "handle";
      return NextResponse.json(
        { error: `Este ${field} já está em uso` },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const keypair = createKeypair();

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        handle: normalizedHandle,
        accountType: data.accountType,
        wallet: {
          create: {
            publicKey: keypair.publicKey,
            encryptedSecret: keypair.secretKey,
            network: "testnet",
          },
        },
      },
    });

    try {
      await fundTestnetAccount(keypair.publicKey);
      await prisma.wallet.update({
        where: { userId: user.id },
        data: { funded: true },
      });
    } catch {
      // Friendbot failure is non-fatal on registration; user can fund later
    }

    await setSession(user.id);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      handle: user.handle,
      email: user.email,
      accountType: user.accountType,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Erro de validação" }, { status: 400 });
    }
    console.error("[register]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
