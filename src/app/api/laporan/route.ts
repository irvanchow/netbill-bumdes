import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { payments, bills, customers, users } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const collectorId = searchParams.get("collectorId") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const conditions = [];

  if (session.user.role === "collector") {
    conditions.push(eq(payments.collectorId, session.user.id));
  } else if (collectorId) {
    conditions.push(eq(payments.collectorId, collectorId));
  }

  if (startDate) {
    conditions.push(gte(payments.paymentDate, startDate));
  }
  if (endDate) {
    conditions.push(lte(payments.paymentDate, endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [data, countResult, summaryResult] = await Promise.all([
    db
      .select({
        id: payments.id,
        transactionCode: payments.transactionCode,
        amountPaid: payments.amountPaid,
        paymentDate: payments.paymentDate,
        paymentMethod: payments.paymentMethod,
        notes: payments.notes,
        collectorName: users.name,
        invoiceNumber: bills.invoiceNumber,
        customerName: customers.name,
        customerAddress: customers.address,
      })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .innerJoin(customers, eq(bills.customerId, customers.id))
      .leftJoin(users, eq(payments.collectorId, users.id))
      .where(whereClause)
      .orderBy(desc(payments.paymentDate))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(payments)
      .where(whereClause),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amountPaid}), 0)::int` })
      .from(payments)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalAmount = summaryResult[0]?.total ?? 0;

  return NextResponse.json({
    data,
    summary: { totalPayments: total, totalAmount },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
