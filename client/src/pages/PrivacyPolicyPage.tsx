export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Política de Privacidad</h1>
        <p className="text-gray-400 mb-8">Última actualización: 13 de marzo de 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Información que recopilamos</h2>
            <p>RastreoYa recopila los siguientes datos cuando usás nuestra aplicación móvil:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Ubicación GPS precisa</strong>: coordenadas de latitud y longitud, precisión del GPS, en tiempo real mientras el tracking está activo.</li>
              <li><strong>Ubicación en segundo plano</strong>: cuando el tracking está activo, la app continúa recopilando tu ubicación aunque la app esté minimizada.</li>
              <li><strong>Fotos de entrega</strong>: imágenes que tomás voluntariamente como prueba de entrega, junto con las coordenadas GPS del momento.</li>
              <li><strong>Nombre/alias</strong>: el nombre que ingresás al unirte a una campaña.</li>
              <li><strong>Identificador de dispositivo</strong>: un ID anónimo generado localmente para identificar tu dispositivo dentro de una campaña.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Cómo usamos tus datos</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Rastreo en tiempo real</strong>: mostramos tu ubicación en un mapa para que la empresa que administra la campaña pueda coordinar las entregas.</li>
              <li><strong>Historial de rutas</strong>: almacenamos el recorrido para que la empresa pueda revisar las rutas realizadas.</li>
              <li><strong>Prueba de entrega</strong>: las fotos sirven como evidencia de que una entrega fue realizada en la ubicación correcta.</li>
              <li><strong>Detección de paradas</strong>: analizamos los datos de ubicación para identificar tiempos de espera.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Con quién compartimos tus datos</h2>
            <p>Tus datos de ubicación y fotos son visibles para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>La <strong>empresa u organización</strong> que creó la campaña a la que te uniste.</li>
              <li>Personas con acceso al <strong>enlace de seguimiento público</strong> de la campaña (si la empresa lo comparte).</li>
            </ul>
            <p className="mt-2">No vendemos ni compartimos tus datos con terceros para publicidad u otros fines comerciales.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Ubicación en segundo plano</h2>
            <p>RastreoYa necesita acceso a tu ubicación en segundo plano para funcionar correctamente. Esto permite que el tracking continúe mientras usás otras apps o cuando la pantalla está apagada.</p>
            <p className="mt-2">La recopilación de ubicación en segundo plano <strong>solo ocurre cuando iniciás el tracking manualmente</strong>. Podés detenerlo en cualquier momento tocando "Pausar" en la app. Si cerrás sesión o salís de la campaña, la recopilación se detiene completamente.</p>
            <p className="mt-2">Podés revocar el permiso de ubicación en segundo plano en cualquier momento desde la configuración de tu dispositivo: <em>Configuración → Apps → RastreoYa → Permisos → Ubicación</em>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Almacenamiento y seguridad</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Los datos se transmiten cifrados mediante <strong>HTTPS/TLS</strong>.</li>
              <li>Los datos se almacenan en servidores seguros.</li>
              <li>Las fotos se almacenan en el servidor de la campaña y no son accesibles públicamente sin autenticación.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Retención de datos</h2>
            <p>Los datos de ubicación y fotos se conservan mientras la campaña esté activa. La empresa administradora de la campaña puede eliminar los datos de la campaña en cualquier momento.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Tus derechos</h2>
            <p>Tenés derecho a:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Detener el tracking</strong> en cualquier momento desde la app.</li>
              <li><strong>Revocar permisos</strong> de ubicación y cámara desde la configuración del dispositivo.</li>
              <li><strong>Solicitar la eliminación</strong> de tus datos contactándonos a la dirección indicada abajo.</li>
              <li><strong>Salir de una campaña</strong> y dejar de compartir datos en cualquier momento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Menores de edad</h2>
            <p>RastreoYa no está dirigida a menores de 13 años. No recopilamos intencionalmente datos de menores de edad.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Cambios a esta política</h2>
            <p>Podemos actualizar esta política de privacidad periódicamente. Te notificaremos de cambios significativos a través de la aplicación.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contacto</h2>
            <p>Si tenés preguntas sobre esta política de privacidad o querés ejercer tus derechos, contactanos en:</p>
            <p className="mt-2"><strong>Email</strong>: contacto@rastreoya.com</p>
            <p><strong>Web</strong>: rastreoya.com</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-500 text-sm">
          <a href="/" className="text-blue-400 hover:text-blue-300">← Volver a RastreoYa</a>
        </div>
      </div>
    </div>
  );
}
