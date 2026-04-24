'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Hotel, BarChart3, ScrollText } from 'lucide-react'
import { animate, stagger } from 'animejs'

const NAV_ITEMS = [
  { href: '/dashboard/home',      label: 'Home',      icon: LayoutDashboard, bg: '#3A3A3C' },
  { href: '/dashboard/suites',    label: 'Suítes',    icon: Hotel,           bg: '#C41E20' },
  { href: '/dashboard/caixa',     label: 'Caixa',     icon: BarChart3,       bg: '#2D7D46' },
  { href: '/dashboard/auditoria', label: 'Auditoria', icon: ScrollText,      bg: '#1D5FA3' },
]

const BASE = 48, MAX = 72, RANGE = 120

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const startX = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    animate('.dock-item', {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: stagger(80),
      duration: 400,
      ease: 'easeOutExpo',
    })
  }, [])

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!window.matchMedia('(hover: hover)').matches) return
    itemRefs.current.forEach((el) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const dist = Math.abs(e.clientX - cx)
      const size = dist > RANGE ? BASE : Math.max(BASE, MAX - (dist / RANGE) * (MAX - BASE))
      el.style.width    = size + 'px'
      el.style.height   = size + 'px'
      el.style.fontSize = (size * 0.45) + 'px'
    })
  }

  function onMouseLeave() {
    itemRefs.current.forEach((el) => {
      if (!el) return
      el.style.width    = BASE + 'px'
      el.style.height   = BASE + 'px'
      el.style.fontSize = '22px'
    })
  }

  function onTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0]
    if (!touch) return
    startX.current = touch.clientX
    isDragging.current = false
    const els = itemRefs.current.filter((el): el is HTMLAnchorElement => el !== null)
    if (els.length === 0) return
    animate(els, {
      translateY: [0, -4, 0],
      duration: 250,
      ease: 'easeOutQuad',
    })
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.touches[0]
    if (!touch) return
    if (Math.abs(touch.clientX - startX.current) > 8) isDragging.current = true
    itemRefs.current.forEach((el) => {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const dist = Math.abs(touch.clientX - cx)
      const size = dist > RANGE ? BASE : Math.max(BASE, MAX - (dist / RANGE) * (MAX - BASE))
      el.style.width    = size + 'px'
      el.style.height   = size + 'px'
      el.style.fontSize = (size * 0.45) + 'px'
    })
  }

  function onTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const touch = e.changedTouches[0]
    if (touch && isDragging.current) {
      const target = document.elementFromPoint(touch.clientX, touch.clientY)
      itemRefs.current.forEach((ref, i) => {
        if (ref && (ref === target || ref.contains(target))) {
          router.push(NAV_ITEMS[i]!.href)
        }
      })
    }
    isDragging.current = false
    itemRefs.current.forEach((el) => {
      if (!el) return
      el.style.width    = BASE + 'px'
      el.style.height   = BASE + 'px'
      el.style.fontSize = '22px'
    })
  }

  function onClickItem(el: HTMLAnchorElement | null) {
    if (!el) return
    animate(el, {
      scale: [1, 0.82, 1],
      duration: 350,
      ease: 'spring(1, 80, 15, 0)',
    })
  }

  return (
    <div
      className="dock-container fixed left-1/2 -translate-x-1/2 z-50"
      style={{ bottom: '16px' }}
    >
      <div
        className="flex items-end gap-1 px-3 py-2"
        style={{
          background: 'rgba(17,17,19,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon, bg }, i) => {
          const active = pathname.startsWith(href)

          return (
            <div key={href} className="group flex flex-col items-center gap-1">
              <div className="relative flex justify-center">

                {/* Tooltip — CSS group-hover, sem state */}
                <span
                  className="absolute pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    background: 'rgba(26,26,31,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    color: '#F0E6D0',
                    zIndex: 10,
                  }}
                >
                  {label}
                </span>

                {/* transition: all — fiel ao dock-nav.html original */}
                <Link
                  ref={(el) => { itemRefs.current[i] = el }}
                  href={href}
                  prefetch={true}
                  onClick={() => onClickItem(itemRefs.current[i] ?? null)}
                  className="dock-item flex items-center justify-center rounded-xl group-hover:-translate-y-1.5"
                  style={{
                    width: BASE + 'px',
                    height: BASE + 'px',
                    fontSize: '22px',
                    backgroundColor: bg,
                    opacity: active ? 1 : 0.6,
                    transition: 'all 0.2s cubic-bezier(.16,1,.3,1)',
                  }}
                >
                  {/* width/height: 1em → herda fontSize e escala com o container */}
                  <Icon
                    className="text-white shrink-0"
                    style={{ width: '1em', height: '1em' }}
                  />
                </Link>
              </div>

              {active && (
                <span
                  className="w-1 h-1 rounded-full shrink-0"
                  style={{ backgroundColor: '#C41E20' }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
