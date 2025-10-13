//app/login/page.tsx
import { LoginForm } from "@/components/login-form"
import { Heart } from "lucide-react"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-left space-x-9 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Salita Feliz</h1>
              <p className="text-sm text-gray-600">Sistema Integral de Gestión de Vacunación</p>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Bienvenido</h2>
          <p className="text-gray-600">Ingresa a tu cuenta para continuar</p>
        </div>

        <LoginForm />

       
      </div>
    </div>
  )
}
