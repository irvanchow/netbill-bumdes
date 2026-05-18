import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { customers, internetPackages, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { pelangganSchema } from "@/lib/validators";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [customer] = await db
    .select({
      id: customers.id,
      name: customers.name,
      address: customers.address,
      phone: customers.phone,
      email: customers.email,
      status: customers.status,
      subscriptionStartDate: customers.subscriptionStartDate,
      packageId: customers.packageId,
      assignedCollectorId: customers.assignedCollectorId,
      packageName: internetPackages.name,
      packageSpeed: internetPackages.speed,
      monthlyPrice: internetPackages.monthlyPrice,
      collectorName: users.name,
      createdAt: customers.createdAt,
    })
    .from(customers)
    .leftJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .leftJoin(users, eq(customers.assignedCollectorId, users.id))
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });

  if (session.user.role === "collector" && customer.assignedCollectorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ data: customer });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const parsed = pelangganSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [updated] = await db
    .update(customers)
    .set({
      name: parsed.data.name,
      address: parsed.data.address,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      packageId: parsed.data.packageId,
      subscriptionStartDate: parsed.data.subscriptionStartDate,
      assignedCollectorId: parsed.data.assignedCollectorId || null,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [updated] = await db
    .update(customers)
    .set({ status: "nonaktif", updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ data: updated });
}
