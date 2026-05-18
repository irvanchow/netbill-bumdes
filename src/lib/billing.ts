import { db } from "@/lib/db";
import { bills, customers, internetPackages } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateInvoiceNumber } from "@/lib/utils";

export async function generateMonthlyBills(period: Date) {
  const billPeriod = new Date(period.getFullYear(), period.getMonth(), 1);
  const billPeriodStr = billPeriod.toISOString().split("T")[0];
  const dueDate = new Date(period.getFullYear(), period.getMonth(), 15);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  const activeCustomers = await db
    .select({
      id: customers.id,
      packageId: customers.packageId,
      monthlyPrice: internetPackages.monthlyPrice,
    })
    .from(customers)
    .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .where(eq(customers.status, "aktif"));

  let generated = 0;
  let skipped = 0;

  for (const customer of activeCustomers) {
    const existing = await db
      .select({ id: bills.id })
      .from(bills)
      .where(
        and(
          eq(bills.customerId, customer.id),
          eq(bills.billPeriod, billPeriodStr)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bills)
      .where(eq(bills.billPeriod, billPeriodStr));

    const sequence = (countResult?.count ?? 0) + 1;
    const invoiceNumber = generateInvoiceNumber(billPeriod, sequence);

    await db.insert(bills).values({
      customerId: customer.id,
      billPeriod: billPeriodStr,
      amount: customer.monthlyPrice,
      status: "belum_bayar",
      dueDate: dueDateStr,
      invoiceNumber,
    });

    generated++;
  }

  return { generated, skipped, total: activeCustomers.length };
}
