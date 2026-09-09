import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalid, requireUser, unauthorized } from "@/lib/api";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const user = await requireUser(); if (!user) return unauthorized();
  const date = request.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!isoDate.test(date)) return invalid("date must be YYYY-MM-DD");
  const logDate = new Date(`${date}T00:00:00.000Z`);
  const categories = await prisma.category.findMany({ where: { userId: user.id }, orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }], include: { tasks: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }], include: { dailyLogs: { where: { userId: user.id, date: logDate }, select: { isCompleted: true } } } } } });
  return NextResponse.json(categories.map((category) => ({ id: category.id, name: category.name, tasks: category.tasks.map((task) => ({ id: task.id, title: task.title, is_completed: task.dailyLogs[0]?.isCompleted ?? false })) })));
}

export async function POST(request: NextRequest) {
  const user = await requireUser(); if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const title = body?.title?.trim(); const categoryId = body?.category_id;
  if (!title || title.length > 255 || typeof categoryId !== "string") return invalid("A title and category are required");
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId: user.id }, select: { id: true } });
  if (!category) return invalid("Category not found");
  const last = await prisma.task.aggregate({ where: { categoryId }, _max: { orderIndex: true } });
  const task = await prisma.task.create({ data: { userId: user.id, categoryId, title, orderIndex: (last._max.orderIndex ?? -1) + 1 }, select: { id: true, title: true } });
  return NextResponse.json(task, { status: 201 });
}
