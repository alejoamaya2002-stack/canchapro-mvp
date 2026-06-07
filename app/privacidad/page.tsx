import Link from "next/link";

const sections = [
  {
    title: "1. Que datos recopilamos",
    body: "Podemos registrar datos del complejo, usuarios internos, reservas, nombres y telefonos de clientes, horarios, cancelaciones, costos fijos, metricas, indicadores y datos publicados en la vista publica."
  },
  {
    title: "2. Para que usamos los datos",
    body: "Usamos los datos para gestionar reservas, visualizar disponibilidad, registrar cancelaciones, generar mensajes operativos, calcular indicadores, mejorar el MVP y obtener aprendizajes de uso durante el piloto."
  },
  {
    title: "3. Datos de jugadores o clientes finales",
    body: "Los nombres y telefonos de jugadores son cargados por el complejo para gestionar reservas. No deben utilizarse para finalidades ajenas a esa gestion sin autorizacion o base razonable."
  },
  {
    title: "4. Informacion economica",
    body: "Los costos fijos e indicadores economicos son visibles solo para usuarios autorizados del complejo, especialmente el rol owner o administrador."
  },
  {
    title: "5. Vista publica",
    body: "La vista publica solo muestra informacion que el complejo decide publicar, como horarios disponibles, precio, fecha, cancha y contacto. La disponibilidad debe confirmarse por WhatsApp."
  },
  {
    title: "6. Conservacion de datos",
    body: "Los datos se conservaran mientras dure el piloto o mientras sean necesarios para la operacion, salvo solicitud de eliminacion cuando corresponda."
  },
  {
    title: "7. Acceso, correccion y eliminacion",
    body: "El usuario puede solicitar acceso, correccion o eliminacion de datos escribiendo a contacto@canchapro.app."
  },
  {
    title: "8. Seguridad",
    body: "Aplicamos medidas razonables de seguridad para esta etapa MVP. Al ser un piloto, no debe cargarse informacion sensible innecesaria."
  },
  {
    title: "9. Servicios de terceros",
    body: "CanchaPro puede apoyarse en Supabase como infraestructura tecnica y en WhatsApp como canal externo de comunicacion. Esos servicios tienen sus propias condiciones y politicas."
  },
  {
    title: "10. Cambios en la politica",
    body: "Esta politica puede actualizarse durante la evolucion del producto y futuras pruebas piloto."
  },
  {
    title: "11. Contacto",
    body: "Para consultas sobre privacidad, escribir a contacto@canchapro.app."
  }
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-field-900 px-4 py-8 text-white sm:px-6 lg:px-8">
      <article className="mx-auto max-w-4xl rounded-lg border border-white/10 bg-white p-6 text-field-900 shadow-soft">
        <span className="text-xs font-black uppercase tracking-wide text-lime-700">Legal MVP/Piloto</span>
        <h1 className="mt-2 text-3xl font-black">Politica de Privacidad - CanchaPro MVP/Piloto</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Version inicial y comprensible para duenos, administradores y encargados durante la etapa piloto.</p>
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
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-black text-field-700" href="/terminos">Ver Terminos y Condiciones</Link>
        </div>
      </article>
    </main>
  );
}
