import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', display: 'swap' });

const THEME_SCRIPT = `try{var t=localStorage.getItem('ef-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: 'Espaço Financeiro',
  description: 'Controle financeiro do casal com tema espacial',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={nunito.variable} suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes de desenhar a página (evita piscar) */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <div className="space-bg" aria-hidden />
        {children}
      </body>
    </html>
  );
}
