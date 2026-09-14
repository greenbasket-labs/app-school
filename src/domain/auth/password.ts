import { compare, hash } from "bcryptjs";

const COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}
