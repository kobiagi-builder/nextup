/**
 * Unit Tests for usePasswordValidation Hook
 *
 * Tests password strength calculation logic:
 * - Individual requirement checks (minLength, uppercase, number)
 * - Strength levels (weak, fair, strong)
 * - Strength percentage calculation
 * - Overall validity
 */

import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePasswordValidation } from '../../../src/features/auth/hooks/usePasswordValidation'

// =============================================================================
// Tests
// =============================================================================

describe('usePasswordValidation', () => {
  describe('Individual Requirements', () => {
    it('should detect minimum length (>= 8 characters)', () => {
      const { result: short } = renderHook(() => usePasswordValidation('abc'))
      expect(short.current.hasMinLength).toBe(false)

      const { result: exact } = renderHook(() => usePasswordValidation('abcdefgh'))
      expect(exact.current.hasMinLength).toBe(true)

      const { result: long } = renderHook(() => usePasswordValidation('abcdefghijklm'))
      expect(long.current.hasMinLength).toBe(true)
    })

    it('should detect uppercase letters', () => {
      const { result: noUpper } = renderHook(() => usePasswordValidation('alllowercase'))
      expect(noUpper.current.hasUppercase).toBe(false)

      const { result: hasUpper } = renderHook(() => usePasswordValidation('hasUppercase'))
      expect(hasUpper.current.hasUppercase).toBe(true)
    })

    it('should detect numbers', () => {
      const { result: noNum } = renderHook(() => usePasswordValidation('nodigitshere'))
      expect(noNum.current.hasNumber).toBe(false)

      const { result: hasNum } = renderHook(() => usePasswordValidation('has1digit'))
      expect(hasNum.current.hasNumber).toBe(true)
    })
  })

  describe('Strength Calculation', () => {
    it('should be weak when 0 requirements met (empty string)', () => {
      const { result } = renderHook(() => usePasswordValidation(''))
      expect(result.current.strength).toBe('weak')
      expect(result.current.strengthPercent).toBe(0)
      expect(result.current.isValid).toBe(false)
    })

    it('should be weak when only 1 requirement met', () => {
      // Only hasNumber
      const { result: numOnly } = renderHook(() => usePasswordValidation('123'))
      expect(numOnly.current.strength).toBe('weak')
      expect(numOnly.current.strengthPercent).toBe(33)
      expect(numOnly.current.isValid).toBe(false)

      // Only hasMinLength
      const { result: lenOnly } = renderHook(() => usePasswordValidation('abcdefgh'))
      expect(lenOnly.current.strength).toBe('weak')
      expect(lenOnly.current.strengthPercent).toBe(33)
      expect(lenOnly.current.isValid).toBe(false)

      // Only hasUppercase
      const { result: upperOnly } = renderHook(() => usePasswordValidation('A'))
      expect(upperOnly.current.strength).toBe('weak')
      expect(upperOnly.current.strengthPercent).toBe(33)
      expect(upperOnly.current.isValid).toBe(false)
    })

    it('should be fair when 2 requirements met', () => {
      // hasMinLength + hasUppercase (no number)
      const { result: lenUpper } = renderHook(() => usePasswordValidation('Abcdefgh'))
      expect(lenUpper.current.strength).toBe('fair')
      expect(lenUpper.current.strengthPercent).toBe(67)
      expect(lenUpper.current.isValid).toBe(false)

      // hasMinLength + hasNumber (no uppercase)
      const { result: lenNum } = renderHook(() => usePasswordValidation('abcdefg1'))
      expect(lenNum.current.strength).toBe('fair')
      expect(lenNum.current.strengthPercent).toBe(67)
      expect(lenNum.current.isValid).toBe(false)
    })

    it('should be strong when all 3 requirements met', () => {
      const { result } = renderHook(() => usePasswordValidation('Password1'))
      expect(result.current.strength).toBe('strong')
      expect(result.current.strengthPercent).toBe(100)
      expect(result.current.isValid).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle exactly 8 characters with all requirements', () => {
      const { result } = renderHook(() => usePasswordValidation('Abcdef1x'))
      expect(result.current.hasMinLength).toBe(true)
      expect(result.current.hasUppercase).toBe(true)
      expect(result.current.hasNumber).toBe(true)
      expect(result.current.isValid).toBe(true)
    })

    it('should handle 7 characters (just under minimum)', () => {
      const { result } = renderHook(() => usePasswordValidation('Abcde1x'))
      expect(result.current.hasMinLength).toBe(false)
      expect(result.current.hasUppercase).toBe(true)
      expect(result.current.hasNumber).toBe(true)
      expect(result.current.isValid).toBe(false)
    })

    it('should handle special characters without counting them as requirements', () => {
      const { result } = renderHook(() => usePasswordValidation('!@#$%^&*'))
      expect(result.current.hasMinLength).toBe(true)
      expect(result.current.hasUppercase).toBe(false)
      expect(result.current.hasNumber).toBe(false)
      expect(result.current.strength).toBe('weak')
    })

    it('should handle passwords with only uppercase and numbers but short', () => {
      const { result } = renderHook(() => usePasswordValidation('A1'))
      expect(result.current.hasMinLength).toBe(false)
      expect(result.current.hasUppercase).toBe(true)
      expect(result.current.hasNumber).toBe(true)
      expect(result.current.strength).toBe('fair')
      expect(result.current.isValid).toBe(false)
    })
  })
})
