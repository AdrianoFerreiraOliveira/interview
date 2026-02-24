import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Bot, Sparkles, AlertCircle } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSignUp, setIsSignUp] = useState(false)

    const handleAuth = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({ email, password })
                if (error) throw error
                alert('Cadastro realizado! Por favor, faca login para testar ou verifique o email se confirmacao for exigida.')
                setIsSignUp(false)
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro na autenticacao')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4 relative">
            <div className="pointer-events-none absolute inset-0 brand-grid opacity-15" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[44vw] bg-gradient-to-r from-primary/10 to-transparent" />

            <div className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-8 shadow-2xl backdrop-blur-sm">
                <div className="mb-8 flex flex-col items-center">
                    <div className="brand-glow mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
                        <Bot className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">DeepDiveIA</h1>
                    <p className="text-sm text-center text-muted-foreground mt-2">{isSignUp ? 'Crie sua conta corporativa' : 'Faca login no Workspace Enterprise'}</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-red-500/15 p-3 text-sm text-red-600">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">E-mail corporativo</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none"
                            placeholder="seu@dominio.com"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm transition-colors focus:border-primary focus:outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
                    >
                        {loading ? 'Aguarde...' : (isSignUp ? 'Criar Conta' : 'Entrar')}
                        <Sparkles className="h-4 w-4" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs text-muted-foreground transition hover:text-primary"
                    >
                        {isSignUp ? 'Ja tem uma conta? Faca login' : 'Primeira vez aqui? Crie uma conta'}
                    </button>
                </div>
            </div>
        </div>
    )
}
