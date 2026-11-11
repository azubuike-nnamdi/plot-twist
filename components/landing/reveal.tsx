"use client"

import { domAnimation, LazyMotion, m, useReducedMotion } from "motion/react"

/** Hero entrance: fade and lift on load, one beat after the previous piece. */
export const enterUp =
  "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards duration-700 ease-out-soft motion-reduce:animate-none"

/**
 * Fades and lifts its children in the first time they scroll into view.
 * Uses Motion's lazy `m` component to keep the bundle small.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  /** Milliseconds to wait before animating, to stagger siblings. */
  delay?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        className={className}
        initial={reduceMotion ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
        transition={{
          duration: 0.9,
          delay: delay / 1000,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
