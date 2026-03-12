import { Response, NextFunction } from 'express';
import prisma from '../db';
import { AuthRequest } from './auth';
import { hasCredits } from '../services/creditService';

/**
 * Middleware that checks if a company has credits for visualization.
 * Returns 402 Payment Required if no credits.
 * SUPER_ADMIN always passes.
 * IMPORTANT: Only use on READ/visualization endpoints. Never on data ingestion.
 */
export const creditCheckMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const companyId = req.company!.companyId;
    const role = req.company!.role;

    // SUPER_ADMIN always has access
    if (role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { credits: true, bonusCredits: true, role: true },
    });

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    if (!hasCredits(company)) {
      res.status(402).json({
        error: 'Sin créditos disponibles',
        code: 'NO_CREDITS',
        message: 'Tu cuenta no tiene créditos. Los datos se siguen recolectando, pero necesitás créditos para visualizar el mapa y los recorridos.',
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};
