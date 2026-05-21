import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { put, del } from "@vercel/blob";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Format file tidak didukung. Gunakan JPG, PNG, atau WebP." }, { status: 400 });
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
  }

  // Delete old logo from blob storage if exists
  const [existing] = await db.select().from(appSettings).limit(1);
  if (existing?.logoUrl) {
    try {
      await del(existing.logoUrl);
    } catch {}
  }

  // Upload to Vercel Blob
  const blob = await put(`logo/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  // Update database
  if (existing) {
    await db
      .update(appSettings)
      .set({ logoUrl: blob.url, updatedAt: new Date() })
      .where(eq(appSettings.id, existing.id));
  } else {
    await db.insert(appSettings).values({
      appName: "Bill BumdesNET",
      bumdesAddress: "",
      logoUrl: blob.url,
    });
  }

  return NextResponse.json({ url: blob.url }, { status: 201 });
}
