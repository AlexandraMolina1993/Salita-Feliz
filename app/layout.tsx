// ./app/layout.tsx
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/contexts/ThemeContext'; 
import { Toaster } from '@/components/ui/toaster'; 

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="es">
            <body className={inter.className}>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
                <Toaster />
            </body>
        </html>
    )
}