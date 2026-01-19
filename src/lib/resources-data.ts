import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type ResourceWithActions = Prisma.ResourceGetPayload<{
  include: { actions: true };
}>;

export async function getFeaturedResources() {
  return await prisma.resource.findMany({
    where: { featured: true, status: "LIVE" },
    include: { actions: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function getResourceBySlug(slug: string) {
  return await prisma.resource.findUnique({
    where: { slug },
    include: { actions: { orderBy: { order: "asc" } } },
  });
}

export async function getAllResources() {
  return await prisma.resource.findMany({
    include: { actions: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getResourcesByCategory(category: string) {
  return await prisma.resource.findMany({
    where: {
      category: category.toUpperCase() as Prisma.EnumResourceCategoryFilter,
    },
    include: { actions: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}
