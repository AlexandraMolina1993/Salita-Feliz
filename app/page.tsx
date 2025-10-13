import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Shield, Users, Calendar, ArrowRight, CheckCircle } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Salita Feliz</h1>
              <p className="text-sm text-gray-600">Sistema de Gestión</p>
            </div>
          </div>
          <Link href="/login">
            <Button className="modern-button">
              Iniciar Sesión
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-100 to-purple-100">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="gradient-text">Bienvenidos</span>
              
              <br />
              Sistema Integral de Gestión de Vacunación
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Administra pacientes, enfermeros, vacunas y turnos de manera eficiente con nuestra plataforma moderna y
              segura.
            </p>
            
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 gradient-text">Características Principales</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu centro de vacunación de manera profesional
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="modern-card card-hover">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl">Gestión de Pacientes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Registro completo de pacientes con historial médico, contactos de emergencia y seguimiento
                  personalizado.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="modern-card card-hover">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-success rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl">Control de Vacunas</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Inventario inteligente con alertas de stock bajo, fechas de vencimiento y trazabilidad completa.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="modern-card card-hover">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-warning rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl">Agenda de Turnos</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Sistema de turnos inteligente con recordatorios automáticos y gestión de disponibilidad.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="modern-card card-hover">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-xl">Personal De Enfermería</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  Administración del equipo de enfermería con horarios y asignación de tareas.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 gradient-text">¿Por qué elegir Salita Feliz?</h2>
              <p className="text-xl text-gray-600 mb-8">
                Nuestra plataforma está diseñada específicamente para centros de vacunación, ofreciendo todas las
                herramientas necesarias para una gestión eficiente y segura.
              </p>

              <div className="space-y-4">
                {[
                  "Interfaz intuitiva y fácil de usar",
                  "Reportes y estadísticas en tiempo real",
                  "Notificaciones automáticas",
                  "Seguridad y respaldo de datos",
                  "Soporte técnico",
                ].map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

           <div className="relative">
  <div className="bg-white rounded-3xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.28 0 4.398.51 6.279 1.418M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-lg font-semibold text-gray-800">Gestión de Pacientes</h4>
          <p className="text-sm text-gray-500">Ficha rápida de ejemplo</p>
        </div>
      </div>

      {/* Datos simulados */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-gray-50 border flex flex-col items-center">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Vacunas</p>
          <p className="text-xs text-gray-500">12 aplicadas</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-50 border flex flex-col items-center">
          <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">Turnos</p>
          <p className="text-xs text-gray-500">5 programados</p>
        </div>
      </div>

      {/* Lista inferior simulada */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
</div>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-4xl font-bold mb-6 gradient-text">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">¿Listo para modernizar tu centro de vacunación?</h2>
         <p className="text-xl text- max-w-2xl mx-auto">
  Únete a los centros de salud que ya confían en Salita Feliz para gestionar sus procesos de vacunación de
  manera eficiente y segura.
         </p>  
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Salita Feliz</span>
              </div>
              <p className="text-gray-400">
                Sistema integral de gestión para centros de vacunación modernos y eficientes.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Producto</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Demo
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Soporte</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentación
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Ayuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Acerca de
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacidad
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Salita Feliz. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
