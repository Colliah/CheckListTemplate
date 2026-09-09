import { PrismaClient } from "@prisma/client";
import { seedTasks } from "../config/seed-tasks";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    const categoryCount = await prisma.category.count({ where: { userId: user.id } });
    if (categoryCount > 0) continue;
    await prisma.$transaction(seedTasks.map((category, categoryIndex) => prisma.category.create({ data: {
      userId: user.id, name: category.name, orderIndex: categoryIndex,
      tasks: { create: category.tasks.map((title, taskIndex) => ({ userId: user.id, title, orderIndex: taskIndex })) },
    } })));
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
