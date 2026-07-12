"use client"

import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

interface EditableTextProps {
  value: string
  onSave: (value: string) => void
  multiline?: boolean
  strikethrough?: boolean
  placeholder?: string
  className?: string
}

export function EditableText({
  value,
  onSave,
  multiline = false,
  strikethrough = false,
  placeholder,
  className,
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing) return
    const el = ref.current
    if (!el) return
    el.innerText = value
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function commit() {
    const text = ref.current?.innerText?.trim() ?? ""
    setEditing(false)
    if (text && text !== value) {
      onSave(text)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault()
      ref.current?.blur()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      if (ref.current) ref.current.innerText = value
      ref.current?.blur()
    }
  }

  if (editing) {
    return (
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn("cursor-text whitespace-pre-wrap break-words outline-none", className)}
      />
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") setEditing(true)
      }}
      className={cn(
        "cursor-text whitespace-pre-wrap break-words",
        !value && "text-muted-foreground",
        strikethrough && "text-muted-foreground line-through",
        className
      )}
    >
      {value || placeholder}
    </div>
  )
}
