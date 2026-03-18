import Link from "next/link";
import { Clock } from "lucide-react";

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Clock className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Pago pendiente</h1>
        <p className="text-white/50 mb-6">
          Tu pago está siendo procesado. Recibirás una notificación cuando sea
          confirmado y tu resumen se generará automáticamente.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          Ir al dashboard
        </Link>
      </div>
    </div>
  );
}
