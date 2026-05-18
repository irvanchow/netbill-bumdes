import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bills, customers, internetPackages, appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "@/lib/pdf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [bill] = await db
    .select({
      id: bills.id,
      invoiceNumber: bills.invoiceNumber,
      billPeriod: bills.billPeriod,
      dueDate: bills.dueDate,
      amount: bills.amount,
      status: bills.status,
      customerName: customers.name,
      customerAddress: customers.address,
      customerPhone: customers.phone,
      customerEmail: customers.email,
      packageName: internetPackages.name,
      packageSpeed: internetPackages.speed,
    })
    .from(bills)
    .innerJoin(customers, eq(bills.customerId, customers.id))
    .leftJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .where(eq(bills.id, id))
    .limit(1);

  if (!bill) return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });

  const [settings] = await db.select().from(appSettings).limit(1);

  const invoiceData = {
    invoiceNumber: bill.invoiceNumber,
    billPeriod: bill.billPeriod,
    dueDate: bill.dueDate,
    amount: bill.amount,
    status: bill.status,
    customerName: bill.customerName,
    customerAddress: bill.customerAddress,
    customerPhone: bill.customerPhone,
    customerEmail: bill.customerEmail,
    packageName: bill.packageName || "Internet",
    packageSpeed: bill.packageSpeed || "-",
    appName: settings?.appName || "BumDes Net",
    bumdesAddress: settings?.bumdesAddress || "",
    invoiceFooterText: settings?.invoiceFooterText || null,
  };

  const pdfBuffer = await renderToBuffer(
    <InvoiceDocument data={invoiceData} />
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bill.invoiceNumber}.pdf"`,
    },
  });
}
