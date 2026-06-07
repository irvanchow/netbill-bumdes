import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bills, customers, internetPackages } from "@/lib/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { generateInvoiceNumber, invoicePrefix, toLocalDateStr } from "@/lib/utils";

async function nextInvoiceSequence(prefix: string): Promise<number> {
  const [row] = await db
    .select({
      maxSeq: sql<number>`COALESCE(MAX(regexp_replace(${bills.invoiceNumber}, '^.*-', '')::int), 0)`,
    })
    .from(bills)
    .where(sql`${bills.invoiceNumber} LIKE ${prefix + "%"}`);
  return (row?.maxSeq ?? 0) + 1;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const months = Number(body.months);

  if (!months || months < 1 || months > 12) {
    return NextResponse.json({ error: "Jumlah bulan tidak valid (1–12)" }, { status: 400 });
  }

  // Ambil data pelanggan + paket
  const [customer] = await db
    .select({
      id: customers.id,
      status: customers.status,
      activationDate: customers.activationDate,
      monthlyPrice: internetPackages.monthlyPrice,
    })
    .from(customers)
    .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .where(eq(customers.id, id))
    .limit(1);

  if (!customer) return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
  if (!customer.activationDate) {
    return NextResponse.json({ error: "Pelanggan belum memiliki tanggal aktivasi" }, { status: 400 });
  }

  // Cari bulan tagihan terakhir (bulanan) yang sudah ada
  const [lastBill] = await db
    .select({ billPeriod: bills.billPeriod })
    .from(bills)
    .where(and(eq(bills.customerId, id), eq(bills.billType, "bulanan")))
    .orderBy(desc(bills.billPeriod))
    .limit(1);

  // Tentukan bulan awal generate:
  // Jika sudah ada tagihan → bulan setelah tagihan terakhir
  // Jika belum ada → bulan pertama billing (activationDate + 1 bulan)
  let startDate: Date;
  if (lastBill?.billPeriod) {
    const [y, m] = lastBill.billPeriod.split("-").map(Number);
    startDate = new Date(y, m, 1); // bulan berikutnya
  } else {
    const [y, m] = customer.activationDate.split("-").map(Number);
    startDate = new Date(y, m, 1); // bulan pertama billing = aktivasi + 1 bulan
  }

  const actDay = Number(customer.activationDate.split("-")[2]);
  const generated: { invoiceNumber: string; billPeriod: string; dueDate: string; amount: number }[] = [];
  let skipped = 0;

  for (let i = 0; i < months; i++) {
    const candidate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    const periodStr = toLocalDateStr(candidate);

    // Cek duplikat
    const [existing] = await db
      .select({ id: bills.id })
      .from(bills)
      .where(and(eq(bills.customerId, id), eq(bills.billPeriod, periodStr)))
      .limit(1);

    if (existing) {
      skipped++;
      continue;
    }

    const lastDay = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0).getDate();
    const dueDay = Math.min(actDay, lastDay);
    const dueDate = new Date(candidate.getFullYear(), candidate.getMonth(), dueDay);
    const dueDateStr = toLocalDateStr(dueDate);

    const prefix = invoicePrefix(candidate);
    const sequence = await nextInvoiceSequence(prefix);
    const invoiceNumber = generateInvoiceNumber(candidate, sequence);

    const [bill] = await db
      .insert(bills)
      .values({
        customerId: id,
        billPeriod: periodStr,
        amount: customer.monthlyPrice,
        status: "belum_bayar",
        billType: "bulanan",
        dueDate: dueDateStr,
        invoiceNumber,
      })
      .returning();

    generated.push({
      invoiceNumber: bill.invoiceNumber,
      billPeriod: bill.billPeriod,
      dueDate: bill.dueDate,
      amount: bill.amount,
    });
  }

  return NextResponse.json({
    generated: generated.length,
    skipped,
    bills: generated,
  });
}
