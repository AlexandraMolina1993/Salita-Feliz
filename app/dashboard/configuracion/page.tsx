// ./app/dashboard/configuracion/page.tsx
import { redirect } from 'next/navigation';

export default function ConfigIndexPage() {
    // Redirige a la pestaña 'general' por defecto
    redirect('/dashboard/configuracion/general');
}