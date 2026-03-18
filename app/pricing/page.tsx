import Link from "next/link";
import { Check, Zap, Crown } from "lucide-react";
import { createClient } from "@/app/lib/supabase/server";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans = [
    {
      name: "Individual",
      price: "$5.000",
      period: "por clase",
      description: "Ideal para resumir clases puntuales",
      icon: Zap,
      features: [
        "1 resumen por compra",
        "Videos de hasta 4 horas",
        "Descarga en PDF",
        "Organización en cuadernos",
      ],
      cta: user ? "/dashboard/new-summary" : "/register",
      ctaText: "Comprar resumen",
      highlight: false,
    },
    {
      name: "Suscripción",
      price: "$30.000",
      period: "por mes",
      description: "Para quienes estudian todos los días",
      icon: Crown,
      features: [
        "Resúmenes ilimitados",
        "Videos de hasta 4 horas",
        "Descarga en PDF",
        "Organización en cuadernos",
        "Procesamiento prioritario",
      ],
      cta: user ? "/dashboard/new-summary?plan=subscription" : "/register",
      ctaText: "Suscribirse",
      highlight: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Nav */}
      <nav className="border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-white tracking-tight">
              UP-Scribe
            </span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-indigo-400 text-sm font-medium">
              Precios simples
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Elegí tu plan
          </h1>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Pagá por clase o suscribite para tener resúmenes ilimitados. Sin
            costos ocultos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 transition-all ${
                plan.highlight
                  ? "bg-indigo-600/10 border-2 border-indigo-500/30"
                  : "bg-white/[0.03] border border-white/[0.06]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Más popular
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.highlight
                      ? "bg-indigo-600/20"
                      : "bg-white/[0.06]"
                  }`}
                >
                  <plan.icon
                    className={`w-5 h-5 ${
                      plan.highlight ? "text-indigo-400" : "text-white/60"
                    }`}
                  />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  {plan.name}
                </h3>
              </div>

              <div className="mb-2">
                <span className="text-4xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-white/40 ml-2">{plan.period}</span>
              </div>
              <p className="text-white/50 text-sm mb-6">{plan.description}</p>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-white/70 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.cta}
                className={`block text-center py-2.5 rounded-lg font-medium transition-colors ${
                  plan.highlight
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                    : "bg-white/[0.06] hover:bg-white/[0.1] text-white/80"
                }`}
              >
                {plan.ctaText}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
