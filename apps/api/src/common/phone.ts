export function normalizePeruvianPhone(input: string): string {
  const digits = input.replace(/\D/g, '');

  if (digits.startsWith('51') && digits.length === 11) {
    return digits;
  }

  if (digits.length === 9) {
    return `51${digits}`;
  }

  throw new Error('El teléfono debe tener 9 dígitos peruanos.');
}
