"use client"

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react"

// Floating game pieces: each drifts at its own speed as the page scrolls.
const pieces = [
  {
    className: "left-[3%] top-[10%] size-4 rounded-full bg-primary",
    speed: -140,
    spin: 90,
  },
  {
    className: "left-[44%] top-[4%] h-3 w-6 rounded-sm bg-twist",
    speed: -60,
    spin: -70,
  },
  {
    className: "right-[4%] top-[8%] size-5 rotate-12 rounded-md bg-gold",
    speed: -200,
    spin: 120,
  },
  {
    className: "left-[8%] bottom-[8%] h-3 w-7 rounded-sm bg-gold",
    speed: -90,
    spin: 60,
  },
  {
    className: "right-[42%] bottom-[4%] size-3 rounded-full bg-twist",
    speed: -160,
    spin: -100,
  },
  {
    className: "right-[10%] bottom-[18%] size-4 rounded-full bg-primary/70",
    speed: -120,
    spin: 40,
  },
]

function Piece({ className, speed, spin }: (typeof pieces)[number]) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 700], [0, speed])
  const rotate = useTransform(scrollY, [0, 700], [0, spin])
  return (
    <motion.span
      aria-hidden
      style={{ y, rotate }}
      className={`absolute ${className}`}
    />
  )
}

/** Decorative pieces behind the hero. Hidden for people who prefer less motion. */
export function HeroConfetti() {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return null
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden opacity-70 md:block"
    >
      {pieces.map((p) => (
        <Piece key={p.className} {...p} />
      ))}
    </div>
  )
}
