import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No-op: status pelanggan kini berbasis event (pembayaran instalasi atau aksi
  // manual admin), bukan lagi dihitung dari tunggakan. Endpoint dipertahankan
  // agar crontab server tetap valid.
  return NextResponse.json({
    message: "Status pelanggan kini berbasis event; tidak ada pembaruan terjadwal.",
  });
}
