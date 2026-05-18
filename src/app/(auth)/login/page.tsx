import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            🚒 BVCT - Sistema de Tickets
          </CardTitle>
          <p className="text-center text-sm text-gray-600 mt-2">
            Gestión de Pedidos del Cuartel de Bomberos
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              El formulario de autenticación se habilita al configurar `.env.local` con Supabase.
            </p>
            <a
              href="/dashboard"
              className="block w-full rounded-lg bg-red-600 px-4 py-2 text-center font-medium text-white hover:bg-red-700"
            >
              Continuar al Dashboard
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
