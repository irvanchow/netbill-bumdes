"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2, Check, AlertCircle } from "lucide-react";
import { connectPrinter, printData, isPrinterConnected, getPrinterName } from "@/lib/bluetooth-printer";
import { buildMultiReceipt, type MultiReceiptData } from "@/lib/esc-pos";
import { toast } from "sonner";

interface Props {
  receiptData: MultiReceiptData;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

type PrintState = "idle" | "connecting" | "printing" | "done" | "error";

export function PrintMultiReceiptButton({ receiptData, size = "default", variant = "outline", className = "" }: Props) {
  const [state, setState] = useState<PrintState>("idle");

  async function handlePrint() {
    if (!("bluetooth" in navigator)) {
      toast.error("Browser tidak mendukung Bluetooth. Gunakan Chrome/Edge di Android.");
      return;
    }
    try {
      setState("connecting");
      if (!isPrinterConnected()) await connectPrinter();
      const printerName = getPrinterName();
      toast.success(`Terhubung ke ${printerName || "printer"}`);
      setState("printing");
      await printData(buildMultiReceipt(receiptData));
      setState("done");
      toast.success("Struk berhasil dicetak");
      setTimeout(() => setState("idle"), 3000);
    } catch (error: unknown) {
      setState("error");
      const message = error instanceof Error ? error.message : "Gagal mencetak struk";
      if (message.includes("cancelled") || message.includes("canceled")) {
        toast.error("Pemilihan printer dibatalkan");
      } else {
        toast.error(message);
      }
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const stateConfig = {
    idle: { icon: Printer, label: "Cetak Struk", disabled: false },
    connecting: { icon: Loader2, label: "Menghubungkan...", disabled: true },
    printing: { icon: Loader2, label: "Mencetak...", disabled: true },
    done: { icon: Check, label: "Tercetak!", disabled: false },
    error: { icon: AlertCircle, label: "Gagal", disabled: false },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handlePrint}
      disabled={config.disabled}
      className={`border-border ${className}`}
    >
      <Icon className={`h-4 w-4 mr-2 ${state === "connecting" || state === "printing" ? "animate-spin" : ""}`} />
      {config.label}
    </Button>
  );
}
