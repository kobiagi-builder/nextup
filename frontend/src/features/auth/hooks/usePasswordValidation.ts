interface PasswordValidation {
  hasMinLength: boolean
  hasUppercase: boolean
  hasNumber: boolean
  strength: 'weak' | 'fair' | 'strong'
  strengthPercent: number
  isValid: boolean
}

export function usePasswordValidation(password: string): PasswordValidation {
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)

  const met = [hasMinLength, hasUppercase, hasNumber].filter(Boolean).length
  const strength: PasswordValidation['strength'] = met <= 1 ? 'weak' : met === 2 ? 'fair' : 'strong'
  const strengthPercent = Math.round((met / 3) * 100)

  return { hasMinLength, hasUppercase, hasNumber, strength, strengthPercent, isValid: met === 3 }
}
