"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
}

export default function ManajemenUserPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [userList, setUserList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const json = await res.json();
    setUserList(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function handleAdd() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function handleEdit(user: User) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  async function handleDelete(user: User) {
    if (!confirm(`Hapus user "${user.name}"? Tindakan ini tidak bisa dibatalkan.`)) return;

    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User berhasil dihapus");
      fetchUsers();
    } else {
      const json = await res.json();
      toast.error(json.error || "Gagal menghapus user");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as string,
      phone: formData.get("phone") as string,
    };

    let res: Response;
    if (editingUser) {
      res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }

    if (res.ok) {
      toast.success(editingUser ? "User berhasil diupdate" : "User berhasil ditambahkan");
      setDialogOpen(false);
      fetchUsers();
    } else {
      const json = await res.json();
      toast.error(json.error || "Gagal menyimpan user");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Manajemen User</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola pengguna dan hak akses</p>
        </div>
        <Button onClick={handleAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" />
          Tambah User
        </Button>
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
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Telepon</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-xs uppercase tracking-wider text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {userList.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                    <td className="p-4 font-medium text-foreground">{user.name}</td>
                    <td className="p-4 text-muted-foreground">{user.email}</td>
                    <td className="p-4 text-muted-foreground">{user.phone || "-"}</td>
                    <td className="p-4">
                      <Badge variant={user.role === "admin" ? "default" : "secondary"} className={user.role === "admin" ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10" : "bg-muted text-muted-foreground border border-border"}>
                        {user.role === "admin" ? "Admin" : "Collector"}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {session?.user?.id !== user.id && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(user)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
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
            {userList.map((user) => (
              <Card key={user.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {user.phone && <p className="text-xs text-muted-foreground mt-1">{user.phone}</p>}
                    </div>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className={user.role === "admin" ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/10" : "bg-muted text-muted-foreground border border-border"}>
                      {user.role === "admin" ? "Admin" : "Collector"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    {session?.user?.id !== user.id && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(user)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {userList.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 stroke-1" />
              <p className="text-sm">Belum ada user.</p>
            </div>
          )}
        </>
      )}

      {/* Dialog Form */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Tambah User Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-foreground">Nama</Label>
              <Input
                id="name"
                name="name"
                defaultValue={editingUser?.name || ""}
                placeholder="Nama lengkap"
                required
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-foreground">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={editingUser?.email || ""}
                placeholder="email@contoh.com"
                required
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-foreground">
                Password {editingUser && <span className="text-muted-foreground font-normal">(kosongkan jika tidak diubah)</span>}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={editingUser ? "••••••••" : "Minimal 6 karakter"}
                required={!editingUser}
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm text-foreground">Role</Label>
              <select
                id="role"
                name="role"
                defaultValue={editingUser?.role || "collector"}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                required
              >
                <option value="admin">Admin</option>
                <option value="collector">Collector</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm text-foreground">Telepon</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={editingUser?.phone || ""}
                placeholder="08xxxxxxxxxx"
                className="bg-card border-border"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="border-border">
                Batal
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {saving ? "Menyimpan..." : editingUser ? "Update" : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
