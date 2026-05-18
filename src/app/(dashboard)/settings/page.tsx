"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Settings {
  id: string;
  appName: string;
  bumdesAddress: string;
  logoUrl: string | null;
  invoiceFooterText: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetch("/api/settings")
      .then((res) => res.json())
      .then((res) => setSettings(res.data))
      .finally(() => setLoading(false));
  }, [session, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      appName: formData.get("appName") as string,
      bumdesAddress: formData.get("bumdesAddress") as string,
      invoiceFooterText: formData.get("invoiceFooterText") as string,
    };

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const json = await res.json();
      setSettings(json.data);
      toast.success("Pengaturan berhasil disimpan");
    } else {
      toast.error("Gagal menyimpan pengaturan");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Pengaturan</h1>
        <div className="max-w-lg h-60 rounded-lg bg-card border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-1">Konfigurasi aplikasi dan invoice</p>
      </div>

      <Card className="max-w-lg border-border shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Pengaturan Aplikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="appName" className="text-sm text-foreground">Nama Aplikasi</Label>
              <Input
                id="appName"
                name="appName"
                defaultValue={settings?.appName || ""}
                placeholder="BumDes Net"
                required
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bumdesAddress" className="text-sm text-foreground">Alamat BumDes</Label>
              <Textarea
                id="bumdesAddress"
                name="bumdesAddress"
                defaultValue={settings?.bumdesAddress || ""}
                placeholder="Alamat lengkap BumDes"
                required
                className="bg-card border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceFooterText" className="text-sm text-foreground">Teks Footer Invoice</Label>
              <Textarea
                id="invoiceFooterText"
                name="invoiceFooterText"
                defaultValue={settings?.invoiceFooterText || ""}
                placeholder="Teks yang muncul di bagian bawah invoice..."
                className="bg-card border-border"
              />
              <p className="text-xs text-muted-foreground">
                Teks ini akan ditampilkan di bagian bawah setiap invoice PDF.
              </p>
            </div>
            <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
