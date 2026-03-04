import { randomBytes, randomInt } from 'crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateCampaignCode(): string {
  let code = 'CAMP-';
  for (let i = 0; i < 6; i++) {
    code += CHARS[randomInt(CHARS.length)];
  }
  return code;
}

export function generateValidationCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[randomInt(CHARS.length)];
  }
  return code;
}

export function generateShareToken(): string {
  return randomBytes(20).toString('hex');
}

export function generateSharePin(): string {
  return String(randomInt(1000, 9999));
}
