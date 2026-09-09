import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, unauthorized } from "@/lib/api";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await requireUser(); if (!user) return unauthorized();
  const category = await prisma.category.findFirst({ where: { id: params.id, userId: user.id }, select: { id: true } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  await prisma.category.delete({ where: { id: category.id } });
  return new NextResponse(null, { status: 204 });
}
