/**
 * ACCESSPREP-X — Authentication Request Validators
 */

export function validateCredentialsInput(body: any): {
  valid: boolean;
  error?: string;
} {
  if (!body?.identifier || !body?.password) {
    return {
      valid: false,
      error: 'Please enter both Roll Number / Email and Password / PIN.'
    };
  }
  return { valid: true };
}

export function validateRegistrationInput(body: any): {
  valid: boolean;
  error?: string;
} {
  if (!body?.name || !body?.email) {
    return {
      valid: false,
      error: 'Name and email are mandatory fields.'
    };
  }
  return { valid: true };
}
