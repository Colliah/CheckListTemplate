import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalid, requireUser, unauthorized } from "@/lib/api";
export async function POST(request: NextRequest) {
  const user = await requireUser(); if (!user) return unauthorized();
  const body = await request.json().catch(() => null); const name = body?.name?.trim();
  if (!name || name.length > 100) return invalid("A category name is required");
  const last = await prisma.category.aggregate({ where: { userId: user.id }, _max: { orderIndex: true } });
  const category = await prisma.category.create({ data: { userId: user.id, name, orderIndex: (last._max.orderIndex ?? -1) + 1 }, select: { id: true, name: true } });
  return NextResponse.json({ ...category, tasks: [] }, { status: 201 });
}
