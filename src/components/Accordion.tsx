import React, { useState, useRef } from 'react'

interface AccordionProps {
  title: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

export function Accordion({ title, children, defaultOpen = false, arrowColor }: AccordionProps & { arrowColor?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const contentId = useRef(`accordion-content-${Math.random().toString(36).substr(2, 9)}`)

  return (
    <div className="border border-inkdark/20 rounded-xl mb-2 bg-golden text-inkdark shadow-md">
      <h3>
        <button
          ref={buttonRef}
          className="w-full flex justify-between items-center px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inkdark hover:bg-yellow-200 rounded-xl"
          aria-expanded={open}
          aria-controls={contentId.current}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{title}</span>
          <span aria-hidden style={arrowColor ? { color: arrowColor } : {}}>{open ? '▲' : '▼'}</span>
        </button>
      </h3>
      <div
        id={contentId.current}
        role="region"
        aria-labelledby={buttonRef.current ? buttonRef.current.id : undefined}
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${open ? 'max-h-[1000px]' : 'max-h-0'}`}
        style={{ willChange: 'max-height' }}
      >
        <div className="px-4 pb-4 pt-1" tabIndex={open ? 0 : -1}>
          {open && children}
        </div>
      </div>
    </div>
  )
}
