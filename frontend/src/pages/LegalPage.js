import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Rocket } from "lucide-react";

const legalContent = {
  privacidad: {
    title: "Politica de Privacidad",
    content: `Ultima actualizacion: Abril 2026

1. RESPONSABLE DEL TRATAMIENTO
Mejora Tu WEB es responsable del tratamiento de los datos personales recogidos a traves de esta plataforma.

2. DATOS QUE RECOGEMOS
- Datos de registro: email, nombre (cuando inicias sesion con Google)
- Datos de uso: URLs analizadas, resultados de analisis
- Datos de pago: procesados directamente por Stripe (no almacenamos datos de tarjeta)
- Datos tecnicos: direccion IP, navegador, dispositivo

3. FINALIDAD DEL TRATAMIENTO
- Proporcionar el servicio de analisis web
- Generar informes personalizados
- Enviar comunicaciones comerciales (si te suscribes)
- Mejorar nuestros servicios

4. BASE LEGAL
- Consentimiento del usuario
- Ejecucion de contrato (cuando contratas servicios premium)
- Interes legitimo (mejora del servicio)

5. DESTINATARIOS
- Stripe: para procesamiento de pagos
- Google: para autenticacion
- OpenAI: para analisis con IA (los datos se procesan de forma anonima)

6. DERECHOS
Puedes ejercer tus derechos de acceso, rectificacion, supresion, limitacion, portabilidad y oposicion contactandonos.

7. CONSERVACION
Los datos se conservan mientras mantengas tu cuenta activa o durante el tiempo necesario para cumplir las finalidades descritas.

8. SEGURIDAD
Implementamos medidas tecnicas y organizativas para proteger tus datos, incluyendo encriptacion SSL y almacenamiento seguro.`,
  },
  terminos: {
    title: "Terminos y Condiciones",
    content: `Ultima actualizacion: Abril 2026

1. ACEPTACION
Al usar Mejora Tu WEB, aceptas estos terminos y condiciones en su totalidad.

2. DESCRIPCION DEL SERVICIO
Mejora Tu WEB ofrece:
- Escaneo rapido gratuito de sitios web
- Analisis completo con IA (servicio premium, 5 euros)
- Informes detallados con recomendaciones

3. USO DEL SERVICIO
- Solo puedes analizar sitios web de los que seas propietario o tengas autorizacion
- No esta permitido el uso abusivo o automatizado del servicio
- Nos reservamos el derecho de limitar el acceso en caso de uso indebido

4. PAGOS Y REEMBOLSOS
- Los pagos se procesan de forma segura a traves de Stripe
- El precio del informe premium es de 5 euros (IVA incluido)
- Ofrecemos garantia de satisfaccion de 7 dias

5. PROPIEDAD INTELECTUAL
- Los informes generados son para tu uso personal o profesional
- La tecnologia, diseño y marca de Mejora Tu WEB son propiedad exclusiva nuestra

6. LIMITACION DE RESPONSABILIDAD
- Los analisis son orientativos y no constituyen asesoria profesional
- No garantizamos resultados especificos derivados de seguir las recomendaciones
- No somos responsables de danos indirectos derivados del uso del servicio

7. MODIFICACIONES
Nos reservamos el derecho de modificar estos terminos. Los cambios seran notificados a traves de la plataforma.

8. LEY APLICABLE
Estos terminos se rigen por la legislacion espanola.`,
  },
  cookies: {
    title: "Politica de Cookies",
    content: `Ultima actualizacion: Abril 2026

1. QUE SON LAS COOKIES
Las cookies son pequenos archivos de texto que se almacenan en tu navegador cuando visitas un sitio web.

2. COOKIES QUE UTILIZAMOS

Cookies esenciales:
- session_token: para mantener tu sesion iniciada (7 dias)
- email_popup_dismissed: para no mostrar el popup de suscripcion repetidamente

Cookies de terceros:
- Stripe: para el procesamiento seguro de pagos
- Google: para la autenticacion con Google OAuth

3. FINALIDAD
- Funcionamiento del servicio
- Autenticacion de usuarios
- Procesamiento de pagos
- Mejora de la experiencia de usuario

4. GESTION DE COOKIES
Puedes configurar tu navegador para:
- Bloquear todas las cookies
- Eliminar cookies existentes
- Recibir una notificacion antes de que se instale una cookie

Ten en cuenta que bloquear cookies esenciales puede afectar al funcionamiento del servicio.

5. MAS INFORMACION
Para mas informacion sobre cookies, visita www.aboutcookies.org.`,
  },
};

export default function LegalPage() {
  const { type } = useParams();
  const page = legalContent[type];

  if (!page) {
    return (
      <div className="min-h-screen bg-[#05050A] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 mb-4">Pagina no encontrada</p>
          <Link to="/" className="text-[#00E5FF] hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05050A] text-white py-16 px-4" data-testid="legal-page">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-[#00E5FF] mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="flex items-center gap-2 mb-8">
          <Rocket className="w-6 h-6 text-[#00E5FF]" />
          <span
            className="text-lg font-black text-white"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            Mejora Tu <span className="text-[#00E5FF]">WEB</span>
          </span>
        </div>

        <h1
          className="text-3xl font-bold mb-8"
          style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
        >
          {page.title}
        </h1>

        <div className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">
          {page.content}
        </div>
      </div>
    </div>
  );
}
