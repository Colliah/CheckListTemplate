import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/api";
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(); if (!user) return unauthorized();
  const task = await prisma.task.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  await prisma.task.delete({ where: { id: task.id } });
  return new NextResponse(null, { status: 204 });
}
