import { NextRequest, NextResponse } from "next/server";
import { updateCustomerStatuses } from "@/lib/billing";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await updateCustomerStatuses();

  return NextResponse.json({
    message: "Status pelanggan berhasil diupdate",
    ...result,
  });
}
