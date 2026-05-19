"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">BVCT</p>
            <h1 className="mt-3 text-3xl font-bold text-gray-900">Algo salió mal</h1>
            <p className="mt-3 text-gray-600">
              La aplicación encontró un error al cargar. Podés reintentar o volver al acceso.
            </p>
            <p className="mt-4 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700">
              {error.message}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => reset()}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
              >
                Reintentar
              </button>
              <a
                href="/login"
                className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-900 hover:bg-gray-50"
              >
                Ir al acceso
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}