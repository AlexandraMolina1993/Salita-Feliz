//app/components/login-form.tsx
'use client'

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { login } from "@/lib/auth"
import Link from "next/link"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await login(email, password)
      if (result.success) {
        router.push("/dashboard")
        router.refresh()
      } else {
        setError(result.error || "Credenciales inválidas. Por favor, revisa tu email y contraseña.")
      }
    } catch (err: any) {
      console.error("Error al procesar inicio de sesión:", err)
      setError(err?.message || "Error al iniciar sesión. Por favor, intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  // 🚨 RUTA DE REGISTRO MODIFICADA PARA ADMINISTRADORES 🚨
  const registerPath = "/register/admin" 
  const forgotPasswordPath = "/auth/forgot-password" 

  return (
    <Card className="modern-card">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
        <CardDescription className="text-center">Ingresa tu email y contraseña para acceder al sistema</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@salitafeliz.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button type="submit" className="w-full modern-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
          
          {/* BOTÓN REGISTRARSE: Ahora apunta a /register/admin */}
          <Link href={registerPath} className="w-full" passHref>
            <Button type="button" variant="outline" className="w-full">
                Registrarse
            </Button>
          </Link>

        </CardFooter>
      </form>

      {/* ENLACE DE CONTRASEÑA */}
      <p className="mt-4 text-center text-sm">
        ¿Olvidaste la Contraseña?{" "}
        <Link href={forgotPasswordPath} className="text-blue-600 hover:underline font-medium">
          Haz clic aquí
        </Link>
      </p>
      
    </Card>
  )
}