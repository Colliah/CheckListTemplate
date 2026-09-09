import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { seedTasks } from "@/config/seed-tasks";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  trustedOrigins: [
    "https://checklisttemplate.vercel.app",
    "http://localhost:3000",
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.$transaction(async (tx) => {
            for (
              let categoryIndex = 0;
              categoryIndex < seedTasks.length;
              categoryIndex++
            ) {
              const category = seedTasks[categoryIndex];
              await tx.category.create({
                data: {
                  userId: user.id,
                  name: category.name,
                  orderIndex: categoryIndex,
                  tasks: {
                    create: category.tasks.map((title, taskIndex) => ({
                      userId: user.id,
                      title,
                      orderIndex: taskIndex,
                    })),
                  },
                },
              });
            }
          });
        },
      },
    },
  },
});
