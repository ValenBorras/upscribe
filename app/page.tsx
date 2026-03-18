import Link from "next/link";
import {
  BookOpen,
  Upload,
  FolderOpen,
  FileText,
  ArrowRight,
  Check,
  Zap,
  Crown,
  GraduationCap,
  Clock,
  Download,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* ─── Navbar ─── */}
      <nav className="border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            <span className="text-xl font-bold text-white tracking-tight">
              UP-Scribe
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/pricing"
              className="text-sm text-white/60 hover:text-white transition-colors hidden sm:block"
            >
              Precios
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
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

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/15 rounded-full blur-[128px]" />

        <div className="relative max-w-4xl mx-auto px-4 pt-32 pb-24 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-8">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-400 text-sm font-medium">
                Hecho para estudiantes de la UP
              </span>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            <span className="text-white">Tus clases,</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
              resumidas con IA
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            Subí el video de tu clase y obtené un resumen completo y organizado
            en minutos. Todo lo que dijo el profesor, estructurado para vos.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <Link
              href={user ? "/dashboard/new-summary" : "/register"}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25"
            >
              Empezar ahora
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 font-medium px-8 py-3.5 rounded-xl transition-all"
            >
              Ver precios
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="relative py-24 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3 block">
              ¿Cómo funciona?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Tres pasos simples
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Subí tu clase",
                description:
                  "Arrastrá el video de tu clase o subí la transcripción. Aceptamos videos de hasta 4 horas.",
              },
              {
                step: "02",
                icon: FolderOpen,
                title: "Elegí tu materia",
                description:
                  "Organizá tus resúmenes en cuadernos por materia. Todo queda ordenado automáticamente.",
              },
              {
                step: "03",
                icon: FileText,
                title: "Descargá tu resumen",
                description:
                  "Recibí un resumen completo en minutos. Visualizalo online o descargalo en PDF.",
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="glass rounded-2xl p-8 h-full transition-all group-hover:border-indigo-500/20">
                  <span className="text-5xl font-bold text-white/[0.04] absolute top-4 right-6">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center mb-5">
                    <item.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-white/50 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-24 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3 block">
              Características
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Todo lo que necesitás para estudiar
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "Resúmenes inteligentes",
                description:
                  "IA que entiende el contexto de tu clase y genera resúmenes estructurados con los puntos clave.",
              },
              {
                icon: FolderOpen,
                title: "Cuadernos por materia",
                description:
                  "Organizá todos tus resúmenes por materia en cuadernos. Encontrá todo fácil.",
              },
              {
                icon: Download,
                title: "Exportá a PDF",
                description:
                  "Descargá tus resúmenes en PDF con formato profesional, listo para imprimir o compartir.",
              },
              {
                icon: Clock,
                title: "Videos de hasta 4 horas",
                description:
                  "Clases largas no son problema. Procesamos videos de hasta 4 horas sin inconvenientes.",
              },
              {
                icon: FileText,
                title: "Transcripción completa",
                description:
                  "Además del resumen, accedé a la transcripción completa de la clase.",
              },
              {
                icon: GraduationCap,
                title: "Hecho para estudiantes",
                description:
                  "Diseñado específicamente para el ritmo y las necesidades de estudiantes universitarios.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-6 transition-all hover:border-indigo-500/20"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-600/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing preview ─── */}
      <section className="py-24 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3 block">
              Precios
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Precios simples, sin sorpresas
            </h2>
            <p className="text-white/50 text-lg">
              Pagá por clase o suscribite para tener resúmenes ilimitados.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white/60" />
                </div>
                <h3 className="text-xl font-semibold text-white">Individual</h3>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$5.000</span>
                <span className="text-white/40 ml-2">por clase</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "1 resumen por compra",
                  "Videos de hasta 4 horas",
                  "Descarga en PDF",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-white/70 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={user ? "/dashboard/new-summary" : "/register"}
                className="block text-center py-2.5 rounded-lg font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white/80 transition-colors"
              >
                Comprar resumen
              </Link>
            </div>

            <div className="relative rounded-2xl p-8 bg-indigo-600/10 border-2 border-indigo-500/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                Más popular
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">
                  Suscripción
                </h3>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$30.000</span>
                <span className="text-white/40 ml-2">por mes</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  "Resúmenes ilimitados",
                  "Videos de hasta 4 horas",
                  "Descarga en PDF",
                  "Procesamiento prioritario",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-white/70 text-sm">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={user ? "/dashboard/new-summary?plan=subscription" : "/register"}
                className="block text-center py-2.5 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
              >
                Suscribirse
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            ¿Listo para estudiar mejor?
          </h2>
          <p className="text-white/50 text-lg mb-8">
            Creá tu cuenta en segundos y empezá a resumir tus clases.
          </p>
          <Link
            href={user ? "/dashboard" : "/register"}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25"
          >
            {user ? "Ir al dashboard" : "Crear cuenta gratis"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white/40">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm">UP-Scribe</span>
          </div>
          <p className="text-white/30 text-sm">
            Hecho con dedicación para estudiantes de la Universidad de Palermo
          </p>
        </div>
      </footer>
    </div>
  );
}
