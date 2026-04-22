'use client'

import { useState, useTransition, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { animate, stagger } from 'animejs'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isUnauthorized = searchParams.get('error') === 'unauthorized'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!titleRef.current || !cardRef.current) return

    const title = titleRef.current
    const text = title.textContent ?? ''
    title.innerHTML = text
      .split('')
      .map((ch) =>
        ch === ' '
          ? ' '
          : `<span class="title-char" style="display:inline-block;opacity:0">${ch}</span>`
      )
      .join('')

    animate('.title-char', {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
      delay: stagger(60),
      ease: 'easeOutExpo',
    })

    animate(cardRef.current, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration: 500,
      ease: 'easeOutExpo',
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Email ou senha incorretos. Verifique seus dados e tente novamente.')
        return
      }

      router.push('/dashboard/home')
    })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-sm"
        style={{ opacity: 0 }}
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <h1
            ref={titleRef}
            className="text-5xl font-bold tracking-widest uppercase font-mono"
            style={{ color: 'var(--red-400)' }}
          >
            PARAÍSO
          </h1>
          <p
            className="mt-2 text-sm tracking-widest uppercase"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sistema de Controle
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8 space-y-6"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {isUnauthorized && (
            <div
              className="rounded-lg px-4 py-3 text-sm text-center"
              style={{
                backgroundColor: 'rgba(196,30,32,0.12)',
                border: '1px solid rgba(196,30,32,0.3)',
                color: 'var(--red-300)',
              }}
            >
              Acesso negado — somente o dono pode acessar este sistema
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-widest"
                style={{ color: 'var(--text-secondary)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-lg px-4 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--red-400)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-widest"
                style={{ color: 'var(--text-secondary)' }}
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-lg px-4 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--red-400)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-default)' }}
              />
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 rounded-lg text-sm font-semibold uppercase tracking-widest transition-all duration-200 disabled:opacity-60"
              style={{
                backgroundColor: isPending ? 'var(--red-600)' : 'var(--red-400)',
                color: '#fff',
              }}
            >
              {isPending ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p
            className="text-xs text-center"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Acesso restrito ao dono do estabelecimento
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
