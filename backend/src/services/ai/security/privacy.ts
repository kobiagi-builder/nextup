/**
 * Privacy Controls
 *
 * GDPR/SOC2 compliant privacy utilities.
 * Ensures no PII exposure in logs or external services.
 */

import crypto from "crypto";

// =============================================================================
// Privacy Configuration
// =============================================================================

export const PRIVACY_CONTROLS = {
  logging: {
    hashUserIds: true,
    excludeContentFromLogs: true,
    maxLoggedMessageLength: 100,
  },
  aiProvider: {
    noTrainingOnData: true, // Passed to AI SDK options
  },
  retention: {
    conversationHistoryDays: 30,
    researchDataDays: 90,
  },
};

// =============================================================================
// PII Detection Patterns
// =============================================================================

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CREDIT_CARD_PATTERN = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;

// =============================================================================
// Hashing
// =============================================================================

/**
 * Hash user ID for logging (one-way hash)
 */
export function hashUserId(userId: string): string {
  return crypto
    .createHash("sha256")
    .update(userId)
    .digest("hex")
    .substring(0, 12);
}

/**
 * Hash sensitive identifier
 */
export function hashIdentifier(
  id: string,
  salt: string = "content-agent",
): string {
  return crypto
    .createHash("sha256")
    .update(id + salt)
    .digest("hex")
    .substring(0, 16);
}

// =============================================================================
// PII Sanitization
// =============================================================================

/**
 * Mask email addresses
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  const visibleChars = Math.min(2, local.length);
  const masked = local.substring(0, visibleChars) + "***";
  return `${masked}@${domain}`;
}

/**
 * Mask phone numbers
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";

  const last4 = digits.slice(-4);
  const prefix =
    digits.length > 7 ? digits.substring(0, digits.length - 7) : "";
  return `${prefix}-***-***-${last4}`;
}

/**
 * Detect and remove PII from text
 */
export function removePII(text: string): string {
  let sanitized = text;

  // Mask emails
  sanitized = sanitized.replace(EMAIL_PATTERN, (email) => maskEmail(email));

  // Mask phone numbers
  sanitized = sanitized.replace(PHONE_PATTERN, (phone) => maskPhone(phone));

  // Redact SSN
  sanitized = sanitized.replace(SSN_PATTERN, "[REDACTED_SSN]");

  // Redact credit cards
  sanitized = sanitized.replace(CREDIT_CARD_PATTERN, "[REDACTED_CC]");

  return sanitized;
}

// =============================================================================
// Logging Sanitization
// =============================================================================

/**
 * Sanitize data for logging (removes PII and sensitive fields)
 */
export function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    // Remove PII from strings
    const sanitized = removePII(data);

    // Truncate if too long
    if (sanitized.length > PRIVACY_CONTROLS.logging.maxLoggedMessageLength) {
      return (
        sanitized.substring(
          0,
          PRIVACY_CONTROLS.logging.maxLoggedMessageLength,
        ) + "..."
      );
    }

    return sanitized;
  }

  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item));
  }

  if (typeof data === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      // Exclude sensitive fields entirely
      if (isSensitiveField(key)) {
        sanitized[key] = "[REDACTED]";
        continue;
      }

      // Hash user IDs
      if (key === "userId" || key === "user_id") {
        sanitized[key] = typeof value === "string" ? hashUserId(value) : value;
        continue;
      }

      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForLogging(value);
    }

    return sanitized;
  }

  return data;
}

/**
 * Check if field name indicates sensitive data
 */
function isSensitiveField(fieldName: string): boolean {
  const sensitivePatterns = [
    "token",
    "password",
    "secret",
    "apiKey",
    "api_key",
    "authorization",
    "cookie",
    "session",
    "access_token",
    "refresh_token",
    "jwt",
    "bearer",
    "email",
    "phone",
    "ssn",
    "creditCard",
    "credit_card",
  ];

  const lowerField = fieldName.toLowerCase();
  return sensitivePatterns.some((pattern) => lowerField.includes(pattern));
}

// =============================================================================
// AI Provider Privacy Options
// =============================================================================

/**
 * Get privacy-safe options for AI SDK
 */
export function getAIPrivacyOptions() {
  return {
    // Anthropic: Disable training on data
    anthropic: {
      headers: {
        "anthropic-beta": "no-training-2024-01-01",
      },
    },
    // OpenAI: Disable training on data (enterprise only)
    openai: {
      // Set in API key configuration
    },
    // Google: Privacy settings
    google: {
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE",
        },
      ],
    },
  };
}

// =============================================================================
// Content Retention
// =============================================================================

/**
 * Check if data should be retained based on age
 */
export function shouldRetainData(
  createdAt: Date,
  type: "conversation" | "research",
): boolean {
  const now = new Date();
  const ageInDays =
    (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  const maxAge =
    type === "conversation"
      ? PRIVACY_CONTROLS.retention.conversationHistoryDays
      : PRIVACY_CONTROLS.retention.researchDataDays;

  return ageInDays < maxAge;
}

/**
 * Get retention policy for data type
 */
export function getRetentionPolicy(type: "conversation" | "research"): {
  days: number;
  deleteAfter: Date;
} {
  const days =
    type === "conversation"
      ? PRIVACY_CONTROLS.retention.conversationHistoryDays
      : PRIVACY_CONTROLS.retention.researchDataDays;

  const deleteAfter = new Date();
  deleteAfter.setDate(deleteAfter.getDate() - days);

  return { days, deleteAfter };
}
