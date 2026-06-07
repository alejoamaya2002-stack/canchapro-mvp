import Link from "next/link";

const sections = [
  {
    title: "1. Alcance del servicio",
    body: "CanchaPro es una herramienta digital en etapa MVP/piloto para gestionar reservas, turnos fijos, cancelaciones, horarios disponibles, mensajes operativos, tablero e indicadores basicos para complejos deportivos."
  },
  {
    title: "2. Usuarios autorizados",
    body: "El servicio esta orientado a duenos, administradores y encargados de complejos de futbol amateur. Cada complejo debe definir quienes pueden usar la herramienta y que rol corresponde a cada persona."
  },
  {
    title: "3. Responsabilidad por la carga de datos",
    body: "El complejo es responsable por la exactitud de los datos que carga, incluyendo reservas, horarios, precios, cancelaciones, costos fijos y telefonos de clientes o jugadores."
  },
  {
    title: "4. Indicadores economicos estimados",
    body: "Los calculos de ocupacion, ingresos estimados, punto de equilibrio y utilidad aproximada son orientativos para la gestion. No reemplazan registros contables, impositivos ni asesoramiento profesional."
  },
  {
    title: "5. Cancelaciones y recuperacion de turnos",
    body: "CanchaPro facilita registrar cancelaciones, publicar horarios disponibles y generar mensajes de reventa, pero no garantiza que los turnos sean revendidos ni que aumenten los ingresos del complejo."
  },
  {
    title: "6. Uso de WhatsApp",
    body: "Los mensajes prearmados pueden enviarse mediante WhatsApp o enlaces externos. CanchaPro no controla la disponibilidad, funcionamiento ni politicas de WhatsApp."
  },
  {
    title: "7. Vista publica",
    body: "La informacion publicada en la vista publica es definida por el complejo y puede incluir horarios, precios, fecha, cancha y datos de contacto. La consulta publica no implica reserva automatica definitiva."
  },
  {
    title: "8. Uso permitido",
    body: "La app debe utilizarse solo para fines de gestion del complejo. No debe usarse para fines ilegales, abusivos, no autorizados o ajenos a la administracion de reservas."
  },
  {
    title: "9. Limitaciones del MVP",
    body: "El producto se encuentra en etapa piloto y puede contener errores, cambios, interrupciones o funcionalidades incompletas. La version productiva futura deberia contar con revision legal profesional."
  },
  {
    title: "10. Propiedad intelectual",
    body: "La marca, diseno, codigo y funcionalidades de CanchaPro pertenecen al equipo desarrollador, salvo los datos cargados por el usuario o por el complejo."
  },
  {
    title: "11. Modificaciones",
    body: "Estos terminos pueden actualizarse durante la evolucion del MVP y de futuras versiones del producto."
  },
  {
    title: "12. Contacto",
    body: "Para consultas sobre estos terminos, escribir a contacto@canchapro.app."
  }
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-field-900 px-4 py-8 text-white sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-lg border border-white/10 bg-white p-6 text-field-900 shadow-soft">
        <span className="text-xs font-black uppercase tracking-wide text-lime-700">Legal MVP/Piloto</span>
        <h1 className="mt-2 text-3xl font-black">Terminos y Condiciones de Uso - CanchaPro MVP/Piloto</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Version inicial, simple y orientada a una prueba piloto con complejos reales.</p>
        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-line bg-slate-50 p-4">
              <h2 className="font-black">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{section.body}</p>
            </section>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link className="inline-flex min-h-11 items-center rounded-lg bg-field-700 px-4 text-sm font-black text-white" href="/">Volver a CanchaPro</Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-black text-field-700" href="/privacidad">Ver Politica de Privacidad</Link>
        </div>
      </article>
    </main>
  );
}
