import { cookies } from "next/headers";
import { prisma } from "./prisma";

export interface SessionUser {
  id: string;
  name: string;
  handle: string;
  email: string;
  accountType: string;
  profileVisibility: string;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("sp_user_id")?.value;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      handle: true,
      email: true,
      accountType: true,
      profileVisibility: true,
    },
  });

  return user;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set("sp_user_id", userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("sp_user_id");
}
