import { NextRequest, NextResponse } from "next/server";
import { generateMonthlyBills } from "@/lib/billing";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const result = await generateMonthlyBills(now);

  return NextResponse.json({
    message: "Tagihan berhasil digenerate",
    ...result,
  });
}
