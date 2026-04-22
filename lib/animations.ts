import { animate, stagger } from 'animejs'

export function staggerEntrance(selector: string, delay = 0) {
  animate(selector, {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 600,
    delay: stagger(50, { start: delay }),
    ease: 'spring(1, 80, 10, 0)',
  })
}

export function animateCounter(
  el: HTMLElement,
  target: number,
  format: (v: number) => string,
  duration = 900
) {
  const obj = { value: 0 }
  animate(obj, {
    value: target,
    duration,
    ease: 'easeOutExpo',
    onUpdate: () => { el.textContent = format(Math.floor(obj.value)) },
    onComplete: () => { el.textContent = format(target) },
  })
}

export function flashCard(el: HTMLElement, color = 'rgba(196,30,32,0.22)') {
  animate(el, {
    backgroundColor: [color, 'transparent'],
    duration: 600,
    ease: 'spring(1, 90, 12, 0)',
  })
}

export function loginEntrance(el: HTMLElement) {
  animate(el, {
    opacity: [0, 1],
    translateY: [20, 0],
    duration: 500,
    ease: 'easeOutExpo',
  })
}
