import { useRef } from 'react'

interface VariableTextareaProps {
  value: string
  onChange: (value: string) => void
  variables: { key: string; label: string }[]
  placeholder?: string
  className?: string
  rows?: number
}

export default function VariableTextarea({ value, onChange, variables, placeholder, className = '', rows = 4 }: VariableTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (varKey: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      onChange(value + varKey)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = value.substring(0, start) + varKey + value.substring(end)
    onChange(newValue)

    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + varKey.length
      textarea.setSelectionRange(newPos, newPos)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {variables.map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(v.key)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            + {v.label}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full border rounded-md p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[160px] ${className}`}
      />
    </div>
  )
}
