"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, ChevronLeft, ChevronRight, UserX, UserCheck } from "lucide-react";
import Link from "next/link";
import { formatRupiah, customerStatusLabel } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string | null;
  status: string;
  subscriptionStartDate: string;
  packageName: string;
  packageSpeed: string;
  monthlyPrice: number;
  collectorName: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function PelangganPage() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.user?.role === "admin";

  const fetchCustomers = useCallback(async (page: number, searchQuery: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (searchQuery) params.set("search", searchQuery);

    const res = await fetch(`/api/pelanggan?${params}`);
    const json = await res.json();
    setCustomers(json.data || []);
    setPagination(json.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    setLoading(false);
  }, []);

  async function handleToggleStatus(c: Customer, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nextStatus = c.status === "aktif" ? "nonaktif" : "aktif";
    const verb = nextStatus === "aktif" ? "Aktifkan" : "Nonaktifkan";
    if (!confirm(`${verb} pelanggan "${c.name}"?`)) return;
    try {
      const res = await fetch(`/api/pelanggan/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Pelanggan berhasil di${verb.toLowerCase()}`);
        fetchCustomers(pagination.page, search);
      } else {
        toast.error(json.error || "Gagal mengubah status");
      }
    } catch {
      toast.error("Gagal mengubah status: koneksi bermasalah");
    }
  }

  useEffect(() => {
    fetchCustomers(1, "");
  }, [fetchCustomers]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCustomers(1, search);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, fetchCustomers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pelanggan</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola data pelanggan internet</p>
        </div>
        {isAdmin && (
          <Link href="/pelanggan/baru">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pelanggan
            </Button>
          </Link>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Cari nama, telepon, atau alamat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Nama</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Telepon</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Paket</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Harga</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{c.address}</div>
                    </td>
                    <td className="p-4 text-muted-foreground">{c.phone}</td>
                    <td className="p-4">
                      <div className="text-foreground">{c.packageName}</div>
                      <div className="text-xs text-muted-foreground">{c.packageSpeed}</div>
                    </td>
                    <td className="p-4 font-medium text-foreground">{formatRupiah(c.monthlyPrice)}</td>
                    <td className="p-4">
                      <Badge variant={c.status === "aktif" ? "default" : "secondary"} className={c.status === "aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" : "bg-muted text-muted-foreground border border-border"}>
                        {customerStatusLabel(c.status)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/pelanggan/${c.id}`}>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">Detail</Button>
                        </Link>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={c.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                            onClick={(e) => handleToggleStatus(c, e)}
                            className={c.status === "aktif" ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-emerald-600"}
                          >
                            {c.status === "aktif" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {customers.map((c) => (
              <Link key={c.id} href={`/pelanggan/${c.id}`}>
                <Card className="hover:shadow-sm transition-shadow border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{c.name}</p>
                        <p className="text-sm text-muted-foreground">{c.phone}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.address}</p>
                      </div>
                      <Badge variant={c.status === "aktif" ? "default" : "secondary"} className={`ml-2 ${c.status === "aktif" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800" : "bg-muted text-muted-foreground border border-border"}`}>
                        {customerStatusLabel(c.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-sm text-muted-foreground">{c.packageName} ({c.packageSpeed})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{formatRupiah(c.monthlyPrice)}</span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={c.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                            onClick={(e) => handleToggleStatus(c, e)}
                            className={c.status === "aktif" ? "text-muted-foreground hover:text-destructive" : "text-muted-foreground hover:text-emerald-600"}
                          >
                            {c.status === "aktif" ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {customers.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-sm">{search ? "Tidak ada pelanggan yang cocok dengan pencarian." : "Belum ada pelanggan."}</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Menampilkan {customers.length} dari {pagination.total} pelanggan
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCustomers(pagination.page - 1, search)}
                  className="border-border"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchCustomers(pagination.page + 1, search)}
                  className="border-border"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
