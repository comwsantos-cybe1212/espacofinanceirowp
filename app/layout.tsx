import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron', display: 'swap' });

const THEME_SCRIPT = `try{var t=localStorage.getItem('ef-theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: 'Espaço Financeiro',
  description: 'Controle financeiro do casal com tema espacial',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${orbitron.variable}`} suppressHydrationWarning>
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
