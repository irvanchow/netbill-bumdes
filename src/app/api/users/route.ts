import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  let query = db.select({ id: users.id, name: users.name, email: users.email, role: users.role, phone: users.phone, createdAt: users.createdAt }).from(users);

  if (role === "collector") {
    query = query.where(eq(users.role, "collector")) as typeof query;
  }

  const data = await query;
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, password, role, phone } = body;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: "Nama, email, password, dan role wajib diisi" }, { status: 400 });
  }

  if (!["admin", "collector"].includes(role)) {
    return NextResponse.json({ error: "Role harus admin atau collector" }, { status: 400 });
  }

  // Check if email already exists
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [newUser] = await db.insert(users).values({
    name,
    email,
    passwordHash,
    role,
    phone: phone || null,
  }).returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  return NextResponse.json({ data: newUser }, { status: 201 });
}
