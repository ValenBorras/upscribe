import Link from "next/link";
import { XCircle } from "lucide-react";

export default function PaymentFailurePage() {
  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Pago rechazado</h1>
        <p className="text-white/50 mb-6">
          El pago no pudo ser procesado. Podés intentar nuevamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/new-summary"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            Intentar de nuevo
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] text-white/60 font-medium px-6 py-2.5 rounded-lg transition-colors hover:bg-white/[0.08]"
          >
            Ir al dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
