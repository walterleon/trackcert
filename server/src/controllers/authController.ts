import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { signToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

function safeCompany(c: { id: string; name: string; email: string; role: string; planName: string; credits: number }) {
  return { id: c.id, name: c.name, email: c.email, role: c.role, planName: c.planName, credits: c.credits };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Name, email and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const existing = await prisma.company.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const company = await prisma.company.create({
      data: { name, email, passwordHash },
    });

    const token = signToken({ companyId: company.id, role: company.role });
    res.status(201).json({ token, company: safeCompany(company) });
  } catch (error) {
    console.error('register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const company = await prisma.company.findUnique({ where: { email } });
    if (!company || !company.passwordHash) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, company.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({ companyId: company.id, role: company.role });
    res.json({ token, company: safeCompany(company) });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.company!.companyId },
      select: { id: true, name: true, email: true, role: true, planName: true, credits: true, createdAt: true },
    });
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    res.json(company);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};
