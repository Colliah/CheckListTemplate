import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalid, requireUser, unauthorized } from "@/lib/api";
const isoDate = /^\d{4}-\d{2}-\d{2}$/;
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(); if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!isoDate.test(body?.date ?? "") || typeof body?.is_completed !== "boolean") return invalid("date and is_completed are required");
  const owned = await prisma.task.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!owned) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const logDate = new Date(`${body.date}T00:00:00.000Z`);
  const log = await prisma.dailyLog.upsert({
    where: { userId_taskId_date: { userId: user.id, taskId: params.id, date: logDate } },
    create: { userId: user.id, taskId: params.id, date: logDate, isCompleted: body.is_completed, completedAt: body.is_completed ? new Date() : null },
    update: { isCompleted: body.is_completed, completedAt: body.is_completed ? new Date() : null },
    select: { isCompleted: true },
  });
  return NextResponse.json({ is_completed: log.isCompleted });
}
