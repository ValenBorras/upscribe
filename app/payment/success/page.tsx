"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  const externalRef = searchParams.get("external_reference");
  const paymentId = searchParams.get("payment_id");
  const isSubscription = searchParams.get("type") === "subscription";

  useEffect(() => {
    const verify = async () => {
      if (isSubscription) {
        // Subscription: webhook handles it, just redirect
        setVerifying(false);
        setVerified(true);
        setTimeout(() => router.push("/dashboard"), 2000);
        return;
      }

      if (!externalRef || !paymentId) {
        setVerifying(false);
        return;
      }

      try {
        const res = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId,
            summaryId: externalRef,
          }),
        });
        const data = await res.json();

        if (data.verified) {
          setVerified(true);
          setTimeout(
            () => router.push(`/dashboard/summary/${externalRef}`),
            2000,
          );
        }
      } catch {
        // Verification failed, user can still check manually
      }
      setVerifying(false);
    };

    verify();
  }, [externalRef, paymentId, isSubscription, router]);

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {verifying ? (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Verificando pago...
            </h1>
            <p className="text-white/50">Un momento por favor</p>
          </>
        ) : verified ? (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              ¡Pago confirmado!
            </h1>
            <p className="text-white/50 mb-4">
              {isSubscription
                ? "Tu suscripción fue activada. Redirigiendo al dashboard..."
                : "Tu resumen se generará ahora. Redirigiendo..."}
            </p>
          </>
        ) : (
          <>
            <CheckCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Pago registrado
            </h1>
            <p className="text-white/50 mb-6">
              Si tu pago fue aprobado, tu resumen se procesará automáticamente.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
            >
              Ir al dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#030712] flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-400" />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
