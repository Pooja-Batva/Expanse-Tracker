import { useRef } from 'react'

export default function OtpInput({ value, onChange, length = 6 }) {
  const inputs = useRef([])
  const digits = value.padEnd(length, '').split('').slice(0, length)

  const update = (idx, char) => {
    const arr = [...digits]
    arr[idx] = char
    onChange(arr.join('').replace(/\s/g, ''))
    if (char && idx < length - 1) inputs.current[idx + 1]?.focus()
  }

  const handleKey = (e, idx) => {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        inputs.current[idx - 1]?.focus()
        const arr = [...digits]; arr[idx - 1] = ''; onChange(arr.join(''))
      } else {
        const arr = [...digits]; arr[idx] = ''; onChange(arr.join(''))
      }
    }
    if (e.key === 'ArrowLeft'  && idx > 0)          inputs.current[idx - 1]?.focus()
    if (e.key === 'ArrowRight' && idx < length - 1) inputs.current[idx + 1]?.focus()
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted)
    inputs.current[Math.min(pasted.length, length - 1)]?.focus()
    e.preventDefault()
  }

  return (
    <div className="otp-inputs">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          className="otp-input"
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={(e) => update(i, e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  )
}
