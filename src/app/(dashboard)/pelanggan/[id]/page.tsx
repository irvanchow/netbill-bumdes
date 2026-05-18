"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  status: string;
  subscriptionStartDate: string;
  packageId: string;
  assignedCollectorId: string | null;
  packageName: string;
  packageSpeed: string;
  monthlyPrice: number;
  collectorName: string | null;
  createdAt: string;
}

interface Package {
  id: string;
  name: string;
  speed: string;
  monthlyPrice: number;
}

interface Collector {
  id: string;
  name: string;
}

export default function DetailPelangganPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    fetch(`/api/pelanggan/${id}`)
      .then((res) => res.json())
      .then((res) => setCustomer(res.data));
  }, [id]);

  useEffect(() => {
    if (editing) {
      fetch("/api/paket")
        .then((res) => res.json())
        .then((res) => setPackages((res.data || []).filter((p: Package & { isActive: boolean }) => p.isActive)));
      fetch("/api/users?role=collector")
        .then((res) => res.json())
        .then((res) => setCollectors(res.data || []))
        .catch(() => {});
    }
  }, [editing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      packageId: formData.get("packageId") as string,
      subscriptionStartDate: formData.get("subscriptionStartDate") as string,
      assignedCollectorId: formData.get("assignedCollectorId") as string,
    };

    const res = await fetch(`/api/pelanggan/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      toast.success("Pelanggan berhasil diperbarui");
      setEditing(false);
      const updated = await fetch(`/api/pelanggan/${id}`).then((r) => r.json());
      setCustomer(updated.data);
    } else {
      toast.error("Gagal memperbarui pelanggan");
    }
    setLoading(false);
  }

  if (!customer) {
    return <div className="animate-pulse p-4">Memuat...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/pelanggan">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Detail Pelanggan</h1>
      </div>

      {!editing ? (
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{customer.name}</CardTitle>
            <Badge variant={customer.status === "aktif" ? "default" : "secondary"}>
              {customer.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Alamat</p>
              <p>{customer.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Telepon</p>
                <p>{customer.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p>{customer.email || "-"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Paket</p>
                <p>{customer.packageName} ({customer.packageSpeed})</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Harga/Bulan</p>
                <p className="font-semibold">{formatRupiah(customer.monthlyPrice)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Mulai Berlangganan</p>
                <p>{formatDate(customer.subscriptionStartDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Collector</p>
                <p>{customer.collectorName || "-"}</p>
              </div>
            </div>
            {isAdmin && (
              <Button onClick={() => setEditing(true)} variant="outline" className="mt-4">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input id="name" name="name" defaultValue={customer.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Alamat</Label>
                <Textarea id="address" name="address" defaultValue={customer.address} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <Input id="phone" name="phone" defaultValue={customer.phone} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={customer.email || ""} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="packageId">Paket Internet</Label>
                <select
                  id="packageId"
                  name="packageId"
                  defaultValue={customer.packageId}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} - {pkg.speed}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionStartDate">Tanggal Mulai</Label>
                <Input
                  id="subscriptionStartDate"
                  name="subscriptionStartDate"
                  type="date"
                  defaultValue={customer.subscriptionStartDate}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedCollectorId">Collector</Label>
                <select
                  id="assignedCollectorId"
                  name="assignedCollectorId"
                  defaultValue={customer.assignedCollectorId || ""}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Pilih collector...</option>
                  {collectors.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
