import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Ticket, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bienvenido al Panel BVCT</h1>
        <p className="text-gray-600 mt-1">Base operativa lista para implementar los módulos de negocio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Tickets Totales</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <Ticket className="w-12 h-12 text-blue-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pendientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <AlertCircle className="w-12 h-12 text-yellow-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Aceptados</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">0</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-100" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Presupuesto</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">$0</p>
              </div>
              <TrendingUp className="w-12 h-12 text-red-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="default">➕ Nuevo Ticket</Button>
            <Button variant="outline">📊 Ver Reportes</Button>
            <Button variant="outline">📋 Mis Tickets</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No hay actividad reciente</p>
        </CardContent>
      </Card>
    </div>
  );
}
