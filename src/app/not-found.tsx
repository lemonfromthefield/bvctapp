import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">BVCT</p>
        <h1 className="mt-3 text-3xl font-bold text-gray-900">Página no encontrada</h1>
        <p className="mt-3 text-gray-600">
          La ruta que intentaste abrir no existe o ya no está disponible.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
        >
          Volver al acceso
        </Link>
      </div>
    </div>
  );
}