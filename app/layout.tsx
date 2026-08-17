// app/layout.tsx
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext'; 
import { Toaster } from '@/components/ui/toaster'; 

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {/* Dejamos que el ThemeProvider maneje la inyección. 
        Para evitar parpadeos de hidratación, agregamos suppressHydrationWarning
      */}
      <html lang="es" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
          <Toaster />
        </body>
      </html>
    </ThemeProvider>
  )
}