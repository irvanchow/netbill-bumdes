"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, Camera, X, CheckCircle, MessageCircle, CalendarPlus, Trash2, Search } from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate, formatBillingPeriod } from "@/lib/utils";
import { PrintReceiptButton } from "@/components/print-receipt-button";
import { PrintMultiReceiptButton } from "@/components/print-multi-receipt-button";
import { buildReceiptText, buildMultiReceiptText } from "@/lib/esc-pos";

interface Bill {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  packageName: string;
  invoiceNumber: string;
  amount: number;
  billPeriod: string;
  billType: string;
  dueDate: string;
  status: string;
  customerId?: string;
}

export default function CatatPembayaranPage() {
  return (
    <Suspense fallback={<div className="animate-pulse p-4">Memuat...</div>}>
      <CatatPembayaranForm />
    </Suspense>
  );
}

function CatatPembayaranForm() {
  const searchParams = useSearchParams();
  const preselectedBillId = searchParams.get("billId") || "";
  const [loading, setLoading] = useState(false);
  const [unpaidBills, setUnpaidBills] = useState<Bill[]>([]);
  const [selectedBills, setSelectedBills] = useState<Bill[]>([]);
  const [billSearch, setBillSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("tunai");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [addingMonth, setAddingMonth] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paidDate, setPaidDate] = useState("");
  const [paidTime, setPaidTime] = useState("");
  const [transactionCode, setTransactionCode] = useState("");
  const [successPayments, setSuccessPayments] = useState<{ invoiceNumber: string; billPeriod: string; amount: number }[]>([]);

  const primaryBill = selectedBills[0] ?? null;
  const totalAmount = selectedBills.reduce((s, b) => s + b.amount, 0);

  const filteredBills = billSearch.trim()
    ? unpaidBills.filter((b) => {
        const q = billSearch.toLowerCase();
        return (
          b.customerName.toLowerCase().includes(q) ||
          b.invoiceNumber.toLowerCase().includes(q)
        );
      })
    : unpaidBills;

  useEffect(() => {
    fetch("/api/tagihan?status=belum_bayar&limit=100")
      .then((res) => res.json())
      .then((res) => {
        setUnpaidBills(res.data || []);
        if (preselectedBillId) {
          const found = (res.data || []).find((b: Bill) => b.id === preselectedBillId);
          if (found) setSelectedBills([found]);
        }
      });
  }, [preselectedBillId]);

  function handleBillChange(billId: string) {
    const found = unpaidBills.find((b) => b.id === billId);
    setSelectedBills(found ? [found] : []);
  }

  async function handleAddMonth() {
    if (!primaryBill) return;
    setAddingMonth(true);
    try {
      // Ambil customerId dari detail tagihan pertama
      const detailRes = await fetch(`/api/tagihan/${primaryBill.id}`);
      const detailJson = await detailRes.json();
      const billCustomerId = detailJson.data?.customerId;
      if (!billCustomerId) {
        toast.error("Tidak bisa menentukan pelanggan");
        return;
      }

      // Fetch tagihan belum bayar pelanggan yang sama
      const selectedIds = new Set(selectedBills.map((b) => b.id));
      const res = await fetch(`/api/tagihan?customerId=${billCustomerId}&status=belum_bayar&limit=12`);
      const json = await res.json();
      const allBills: Bill[] = json.data || [];

      const nextBill = allBills
        .filter((b) => !selectedIds.has(b.id) && b.billType === "bulanan")
        .sort((a, b) => a.billPeriod.localeCompare(b.billPeriod))[0];

      if (nextBill) {
        setSelectedBills((prev) => [...prev, nextBill]);
        toast.success(`Tagihan ${formatBillingPeriod(nextBill.billPeriod)} ditambahkan`);
      } else {
        // Generate tagihan bulan berikutnya
        toast.info("Membuat tagihan bulan berikutnya...");
        const genRes = await fetch(`/api/pelanggan/${billCustomerId}/generate-tagihan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ months: 1 }),
        });
        const genJson = await genRes.json();
        if (!genRes.ok || genJson.generated === 0) {
          toast.error(genJson.error || "Tidak ada tagihan baru yang bisa dibuat");
          return;
        }

        // Refresh dan tambahkan
        const refreshRes = await fetch(`/api/tagihan?customerId=${billCustomerId}&status=belum_bayar&limit=12`);
        const refreshJson = await refreshRes.json();
        const refreshedBills: Bill[] = refreshJson.data || [];
        const newBill = refreshedBills
          .filter((b) => !selectedIds.has(b.id) && b.billType === "bulanan")
          .sort((a, b) => a.billPeriod.localeCompare(b.billPeriod))[0];

        if (newBill) {
          setSelectedBills((prev) => [...prev, newBill]);
          toast.success(`Tagihan ${formatBillingPeriod(newBill.billPeriod)} dibuat dan ditambahkan`);
        } else {
          toast.error("Tidak ada tagihan berikutnya yang tersedia");
        }
      }
    } catch {
      toast.error("Gagal menambahkan bulan");
    }
    setAddingMonth(false);
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const json = await res.json();
        setProofImageUrl(json.url);
        setPreviewUrl(URL.createObjectURL(file));
        toast.success("Bukti transfer berhasil diupload");
      } else {
        const json = await res.json();
        toast.error(json.error || "Gagal upload file");
      }
    } catch {
      toast.error("Gagal upload file");
    }
    setUploading(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedBills.length === 0) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const paymentDate = formData.get("paymentDate") as string;
    const notes = formData.get("notes") as string;

    const isMulti = selectedBills.length > 1;

    const body = isMulti
      ? {
          billIds: selectedBills.map((b) => b.id),
          paymentDate,
          paymentMethod,
          proofImageUrl: proofImageUrl || undefined,
          notes,
        }
      : {
          billId: selectedBills[0].id,
          amountPaid: selectedBills[0].amount,
          paymentDate,
          paymentMethod,
          proofImageUrl: proofImageUrl || undefined,
          notes,
        };

    const res = await fetch("/api/pembayaran", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const json = await res.json();
      toast.success("Pembayaran berhasil dicatat");
      setPaidDate(paymentDate);
      setPaidTime(json.paymentTime);
      setTransactionCode(json.transactionCode);
      setSuccessPayments(
        isMulti
          ? json.payments.map((p: { invoiceNumber: string; billPeriod: string; amount: number }) => ({
              invoiceNumber: p.invoiceNumber,
              billPeriod: p.billPeriod,
              amount: p.amount,
            }))
          : [{ invoiceNumber: selectedBills[0].invoiceNumber, billPeriod: selectedBills[0].billPeriod, amount: selectedBills[0].amount }]
      );
      setPaymentSuccess(true);
    } else {
      const err = await res.json();
      toast.error(err.error || "Gagal mencatat pembayaran");
    }
    setLoading(false);
  }

  const today = new Date().toISOString().split("T")[0];

  // ── Screen sukses ────────────────────────────────────────────────────────
  if (paymentSuccess && primaryBill) {
    const isMulti = successPayments.length > 1;
    const multiData = {
      appName: "Bill BumdesNET",
      address: "Desa Jelijah Punggang",
      transactionCode,
      paymentDate: paidDate.split("-").reverse().join("-"),
      paymentTime: paidTime.slice(0, 5),
      customerName: primaryBill.customerName,
      customerAddress: primaryBill.customerAddress || "-",
      packageName: primaryBill.packageName || "-",
      paymentMethod,
      collectorName: "-",
      bills: successPayments.map((p) => ({
        invoiceNumber: p.invoiceNumber,
        period: formatBillingPeriod(p.billPeriod),
        amount: p.amount,
      })),
      totalAmount,
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Link href="/pembayaran">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">Pembayaran Berhasil</h1>
        </div>

        <Card className="max-w-lg border-border">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950">
                <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pembayaran Tercatat</h2>
                <p className="text-sm text-muted-foreground mt-1">{primaryBill.customerName}</p>
                {isMulti ? (
                  <div className="mt-2 text-left text-sm space-y-1">
                    {successPayments.map((p) => (
                      <div key={p.invoiceNumber} className="flex justify-between text-muted-foreground">
                        <span>{formatBillingPeriod(p.billPeriod)}</span>
                        <span>{formatRupiah(p.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-foreground border-t border-border pt-1 mt-1">
                      <span>Total</span>
                      <span>{formatRupiah(totalAmount)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-primary mt-2">{formatRupiah(primaryBill.amount)}</p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-4">
                {isMulti ? (
                  <>
                    <PrintMultiReceiptButton receiptData={multiData} className="w-full" />
                    {primaryBill.customerPhone && (
                      <a
                        href={`https://wa.me/${primaryBill.customerPhone.replace(/^0/, "62").replace(/\D/g, "")}?text=${encodeURIComponent(buildMultiReceiptText(multiData))}`}
                        target="_blank" rel="noopener noreferrer" className="w-full"
                      >
                        <Button variant="outline" className="w-full border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700">
                          <MessageCircle className="h-4 w-4 mr-2" />Kirim Struk via WA
                        </Button>
                      </a>
                    )}
                  </>
                ) : (
                  <>
                    <PrintReceiptButton
                      receiptData={{
                        appName: "Bill BumdesNET",
                        address: "Desa Jelijih Punggang",
                        transactionCode,
                        invoiceNumber: primaryBill.invoiceNumber,
                        paymentDate: paidDate.split("-").reverse().join("-"),
                        paymentTime: paidTime.slice(0, 5),
                        billType: primaryBill.billType,
                        customerName: primaryBill.customerName,
                        customerAddress: primaryBill.customerAddress || "-",
                        packageName: primaryBill.packageName || "-",
                        period: formatBillingPeriod(primaryBill.billPeriod),
                        amount: primaryBill.amount,
                        paymentMethod,
                        collectorName: "-",
                      }}
                      className="w-full"
                    />
                    {primaryBill.customerPhone && (
                      <a
                        href={`https://wa.me/${primaryBill.customerPhone.replace(/^0/, "62").replace(/\D/g, "")}?text=${encodeURIComponent(
                          buildReceiptText({
                            appName: "Bill BumdesNET",
                            address: "Desa Jelijah Punggang",
                            transactionCode,
                            invoiceNumber: primaryBill.invoiceNumber,
                            paymentDate: paidDate.split("-").reverse().join("-"),
                            paymentTime: paidTime.slice(0, 5),
                            billType: primaryBill.billType,
                            customerName: primaryBill.customerName,
                            customerAddress: primaryBill.customerAddress || "-",
                            packageName: primaryBill.packageName || "-",
                            period: formatBillingPeriod(primaryBill.billPeriod),
                            amount: primaryBill.amount,
                            paymentMethod,
                            collectorName: "-",
                          })
                        )}`}
                        target="_blank" rel="noopener noreferrer" className="w-full"
                      >
                        <Button variant="outline" className="w-full border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700">
                          <MessageCircle className="h-4 w-4 mr-2" />Kirim Struk via WA
                        </Button>
                      </a>
                    )}
                  </>
                )}
                <Link href="/pembayaran" className="w-full">
                  <Button variant="ghost" className="w-full text-muted-foreground">Kembali ke Pembayaran</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Form utama ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/pembayaran">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">Catat Pembayaran</h1>
      </div>

      <Card className="max-w-lg">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pilih tagihan pertama */}
            {preselectedBillId && primaryBill ? (
              <div className="p-3 bg-accent/50 rounded-lg text-sm border border-border">
                <p><strong>Pelanggan:</strong> {primaryBill.customerName}</p>
                <p><strong>Invoice:</strong> {primaryBill.invoiceNumber}</p>
                <p><strong>Periode:</strong> {formatBillingPeriod(primaryBill.billPeriod)}</p>
                <p><strong>Tagihan:</strong> {formatRupiah(primaryBill.amount)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="billId">Tagihan</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Cari nama pelanggan atau invoice..."
                    value={billSearch}
                    onChange={(e) => setBillSearch(e.target.value)}
                    className="pl-9 bg-card border-border"
                  />
                </div>
                <select
                  id="billId"
                  required={selectedBills.length === 0}
                  defaultValue={preselectedBillId}
                  onChange={(e) => handleBillChange(e.target.value)}
                  size={Math.min(8, Math.max(4, filteredBills.length + 1))}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Pilih tagihan...</option>
                  {filteredBills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.customerName} - {bill.invoiceNumber} ({formatRupiah(bill.amount)})
                    </option>
                  ))}
                </select>
                {billSearch && filteredBills.length === 0 && (
                  <p className="text-xs text-muted-foreground">Tidak ada tagihan yang cocok dengan pencarian.</p>
                )}
              </div>
            )}

            {/* Daftar tagihan terpilih (jika lebih dari 1) */}
            {selectedBills.length > 1 && (
              <div className="rounded-lg border border-border divide-y divide-border text-sm">
                {selectedBills.map((b, i) => (
                  <div key={b.id} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="text-foreground font-medium">{formatBillingPeriod(b.billPeriod)}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{b.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{formatRupiah(b.amount)}</span>
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedBills((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between px-3 py-2 font-semibold text-foreground bg-accent/30">
                  <span>Total</span>
                  <span>{formatRupiah(totalAmount)}</span>
                </div>
              </div>
            )}

            {/* Tombol tambah bulan */}
            {primaryBill && primaryBill.billType === "bulanan" && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed border-primary text-primary hover:bg-primary/5"
                onClick={handleAddMonth}
                disabled={addingMonth}
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                {addingMonth ? "Memuat..." : "+ Tambah Bulan"}
              </Button>
            )}

            {/* Jumlah bayar */}
            <div className="space-y-2">
              <Label>Jumlah Bayar (Rp)</Label>
              <Input
                type="number"
                value={totalAmount || ""}
                readOnly
                required={selectedBills.length > 0}
                className="text-lg bg-muted cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Tanggal Bayar</Label>
                <Input id="paymentDate" name="paymentDate" type="date" defaultValue={today} required className="bg-card border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Metode</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                >
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>

            {paymentMethod === "transfer" && (
              <div className="space-y-2">
                <Label>Bukti Transfer</Label>
                {previewUrl ? (
                  <div className="relative">
                    <img src={previewUrl} alt="Bukti transfer" className="w-full max-h-48 object-contain rounded-lg border border-border bg-accent/30" />
                    <button type="button" onClick={() => { setProofImageUrl(""); setPreviewUrl(""); }}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>{uploading ? "Mengupload..." : "Pilih File"}</span>
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileInput} disabled={uploading} className="hidden" />
                    </label>
                    <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border bg-card text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground cursor-pointer transition-colors">
                      <Camera className="h-4 w-4" />
                      <span>Kamera</span>
                      <input type="file" accept="image/*" capture="environment" onChange={handleFileInput} disabled={uploading} className="hidden" />
                    </label>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG, atau WebP. Maksimal 5MB.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Textarea id="notes" name="notes" placeholder="Catatan tambahan..." />
            </div>

            <Button type="submit" disabled={loading || selectedBills.length === 0} className="w-full h-12 text-lg">
              {loading ? "Memproses..." : `Konfirmasi Pembayaran${selectedBills.length > 1 ? ` (${selectedBills.length} bulan)` : ""}`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
