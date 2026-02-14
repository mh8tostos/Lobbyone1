import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'sonner';
import FirebaseEnvDebugPanel from '@/components/FirebaseEnvDebugPanel';

export const metadata = {
  title: 'HotelNetwork - Rencontres Professionnelles',
  description: 'Connectez-vous avec des professionnels lors de vos séjours hôteliers',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6366f1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-background antialiased">
        <AuthProvider>
          {children}
          <FirebaseEnvDebugPanel />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
