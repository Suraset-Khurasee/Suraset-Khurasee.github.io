import { useCallback, useEffect, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from 'motion/react'

import './DodgeField.css'

const COUNT_LINE = 0.55
const DEAD_ZONE = 6
const INSET = 12
const DEFAULT_TAUNTS = ['Catch me', 'Nope', 'Too slow', 'Almost', 'Okay, okay']

const wallIt = (t, room, wall) => {
  if (wall === 'bounce') {
    if (t > room) return Math.max(-room, 2 * room - t)
    if (t < -room) return Math.min(room, -2 * room - t)
    return t
  }
  return Math.min(room, Math.max(-room, t))
}

const bearingOf = (dx, dy, d, axis) => {
  if (axis === 'x') return { x: Math.sign(dx) || 1, y: 0 }
  if (axis === 'y') return { x: 0, y: Math.sign(dy) || 1 }
  return { x: dx / d, y: dy / d }
}

export default function DodgeField({
  children,
  taunts = DEFAULT_TAUNTS,
  notice = '',
  inkColor = '#f5f5f5',
  contrastColor = '#18181b',
  fieldHeight = 240,
  reach = 72,
  radius = 120,
  falloff = 2,
  fleeDuration = 130,
  returnDuration = 620,
  returnBounce = 0.1,
  axis = 'both',
  wall = 'clamp',
  patience = 4,
  disabled = false,
  caughtHoldMs = 760,
  href,
  onDodge,
  onRelent,
  onCatch,
  className = '',
  style,
}) {
  const fieldRef = useRef(null)
  const moverRef = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const transform = useMotionTemplate`translate(${x}px, ${y}px)`
  const reduce = useReducedMotion()
  const [fine, setFine] = useState(true)
  const [inside, setInside] = useState(false)
  const [dodges, setDodges] = useState(0)
  const [caught, setCaught] = useState(false)
  const gave = dodges >= Math.max(1, patience)
  const still = gave || caught || disabled || !!reduce

  const pointer = useRef(null)
  const bearing = useRef({ x: 1, y: 0 })
  const armed = useRef(true)
  const room = useRef({ x: 0, y: 0 })
  const raf = useRef(0)
  const hold = useRef(undefined)
  const live = useRef({})
  useEffect(() => {
    live.current = {
      reach,
      radius,
      falloff,
      fleeDuration,
      returnDuration,
      returnBounce,
      axis,
      wall,
      still,
      inside,
      reduce,
    }
  }, [
    reach,
    radius,
    falloff,
    fleeDuration,
    returnDuration,
    returnBounce,
    axis,
    wall,
    still,
    inside,
    reduce,
  ])

  useEffect(() => {
    const field = fieldRef.current
    const mover = moverRef.current
    if (!field || !mover) return undefined

    const measure = () => {
      room.current = {
        x: Math.max(0, (field.clientWidth - mover.offsetWidth) / 2 - INSET),
        y: Math.max(0, (field.clientHeight - mover.offsetHeight) / 2 - INSET),
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(field)
    observer.observe(mover)
    return () => observer.disconnect()
  }, [])

  const frame = useCallback(() => {
    raf.current = 0
    const field = fieldRef.current
    const pointerPosition = pointer.current
    const current = live.current
    if (!field) return

    const rect = field.getBoundingClientRect()
    const zoom = rect.width / (field.offsetWidth || rect.width) || 1
    const dx = pointerPosition
      ? (pointerPosition.x - (rect.left + rect.width / 2)) / zoom
      : Infinity
    const dy = pointerPosition
      ? (pointerPosition.y - (rect.top + rect.height / 2)) / zoom
      : Infinity
    const distance = Math.hypot(dx, dy)
    const isInside = distance <= current.radius

    if (!isInside && !current.inside) return
    if (!current.still) {
      if (distance < current.radius * COUNT_LINE) {
        if (armed.current) {
          armed.current = false
          setDodges((count) => count + 1)
        }
      } else if (distance > current.radius) {
        armed.current = true
      }
    }

    if (Number.isFinite(distance) && distance > DEAD_ZONE) {
      bearing.current = bearingOf(dx, dy, distance, current.axis)
    }

    const flee =
      isInside && !current.still
        ? (1 - distance / current.radius) ** current.falloff
        : 0
    const targetX = wallIt(
      -bearing.current.x * flee * current.reach,
      room.current.x,
      current.wall,
    )
    const targetY = wallIt(
      -bearing.current.y * flee * current.reach,
      room.current.y,
      current.wall,
    )

    if (current.reduce) {
      x.jump(0)
      y.jump(0)
    } else {
      const config =
        flee > 0
          ? { type: 'spring', duration: current.fleeDuration / 1000, bounce: 0 }
          : {
              type: 'spring',
              duration: current.returnDuration / 1000,
              bounce: current.returnBounce,
            }
      animate(x, targetX, config)
      animate(y, targetY, config)
    }

    if (isInside !== current.inside) setInside(isInside)
  }, [x, y])

  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setFine(query.matches)
    sync()
    query.addEventListener('change', sync)
    if (!query.matches || disabled) {
      return () => query.removeEventListener('change', sync)
    }

    const tick = () => {
      if (!raf.current) raf.current = requestAnimationFrame(frame)
    }
    const onMove = (event) => {
      if (event.pointerType === 'touch') return
      pointer.current = { x: event.clientX, y: event.clientY }
      tick()
    }
    const onLeave = () => {
      pointer.current = null
      tick()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('scroll', tick, { passive: true, capture: true })
    document.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)

    return () => {
      query.removeEventListener('change', sync)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', tick, { capture: true })
      document.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
      cancelAnimationFrame(raf.current)
      raf.current = 0
    }
  }, [disabled, frame])

  useEffect(() => {
    if (!raf.current) raf.current = requestAnimationFrame(frame)
  }, [still, frame])

  useEffect(() => {
    if (dodges) onDodge?.(dodges)
  }, [dodges, onDodge])

  useEffect(() => {
    if (gave) onRelent?.()
  }, [gave, onRelent])

  useEffect(() => () => clearTimeout(hold.current), [])

  const handleClick = () => {
    setCaught(true)
    onCatch?.()
    clearTimeout(hold.current)
    hold.current = setTimeout(() => {
      setCaught(false)
      setDodges(0)
      armed.current = false
    }, caughtHoldMs)
  }

  const state = { dodges, gave, caught, fleeing: inside && !still }
  const index =
    gave || caught ? taunts.length - 1 : Math.min(dodges, Math.max(0, taunts.length - 2))
  const content =
    typeof children === 'function'
      ? children(state)
      : (children ?? (() => {
          const Pill = href ? 'a' : 'button'
          const pillProps = href
            ? { href }
            : { type: 'button' }

          return (
            <Pill {...pillProps} className="dodge-field__pill" aria-label={taunts[0]}>
              <span className="dodge-field__labels">
                {taunts.map((taunt, i) => (
                  <span
                    key={`${taunt}-${i}`}
                    className="dodge-field__label"
                    data-active={i === index ? 'true' : 'false'}
                    aria-hidden="true"
                  >
                    {taunt}
                  </span>
                ))}
              </span>
            </Pill>
          )
        })())

  return (
    <div
      ref={fieldRef}
      className={`dodge-field${className ? ` ${className}` : ''}`}
      data-coarse={fine ? undefined : ''}
      data-flat={reduce ? '' : undefined}
      style={{
        '--df-ink': inkColor,
        '--df-contrast': contrastColor,
        '--df-height': `${fieldHeight}px`,
        ...style,
      }}
    >
      <motion.div
        ref={moverRef}
        className="dodge-field__mover"
        style={{ transform }}
        data-fled={inside && !still ? 'true' : 'false'}
        data-relented={gave ? 'true' : 'false'}
        data-caught={caught ? 'true' : 'false'}
        onClick={handleClick}
      >
        {content}
      </motion.div>
      {!fine && notice ? <p className="dodge-field__notice">{notice}</p> : null}
    </div>
  )
}
