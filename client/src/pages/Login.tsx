import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function Login() {
  const { signIn, signInWithGoogle, user } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  if (user) { setLocation('/chat'); return null; }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success('Conta criada com sucesso!');
      } else {
        await signIn(email, password);
        toast.success('Bem-vindo ao Jarvis!');
      }
      setLocation('/chat');
    } catch (error: any) {
      toast.error(error.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Bem-vindo ao Jarvis!');
      setLocation('/chat');
    } catch (error: any) {
      toast.error(error.message || 'Falha no login com Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 70% 20%, rgba(124,58,237,0.22) 0%,transparent 55%),' +
          'radial-gradient(ellipse at 30% 80%, rgba(37,99,235,0.15) 0%,transparent 55%),' +
          '#060011',
      }}
    >
      {/* Floating orb decorations */}
      <div
        className="absolute top-[-80px] right-[-60px] w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}
      />
      <div
        className="absolute bottom-[-60px] left-[-40px] w-48 h-48 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'linear-gradient(135deg,#3b82f6,#06b6d4)' }}
      />

      {/* Card */}
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-[28px] flex items-center justify-center text-4xl font-extrabold text-white mb-4 shadow-2xl"
            style={{
              background: 'linear-gradient(135deg,#7c3aed,#3b82f6)',
              boxShadow: '0 0 40px rgba(124,58,237,0.5)',
            }}
          >
            J
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Jarvis Travel</h1>
          <p className="text-white/40 text-sm mt-1">Seu concierge de viagens com IA</p>
        </div>

        {/* Form */}
        <div
          className="rounded-3xl p-6 flex flex-col gap-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-12 rounded-2xl px-4 text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.9)',
              }}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="h-12 rounded-2xl px-4 text-sm outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.9)',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="h-12 rounded-2xl text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 mt-1"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#3b82f6)' }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isSignUp ? 'Criando conta...' : 'Entrando...'}
                </div>
              ) : (
                isSignUp ? 'Criar conta' : 'Entrar'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-white/25 text-xs">ou</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="h-12 rounded-2xl flex items-center justify-center gap-3 font-medium text-sm transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continuar com Google
          </button>

          {/* Toggle sign-up / sign-in */}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            disabled={loading}
            className="text-center text-xs transition-colors"
            style={{ color: 'rgba(167,139,250,0.8)' }}
          >
            {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar agora'}
          </button>
        </div>
      </div>
    </div>
  );
}
