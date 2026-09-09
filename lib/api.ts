import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function requireUser() {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session?.user) return null;
  return session.user;
}
export function unauthorized() { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
export function invalid(message: string) { return NextResponse.json({ error: message }, { status: 400 }); }
