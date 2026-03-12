"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditCheckMiddleware = void 0;
const db_1 = __importDefault(require("../db"));
const creditService_1 = require("../services/creditService");
/**
 * Middleware that checks if a company has credits for visualization.
 * Returns 402 Payment Required if no credits.
 * SUPER_ADMIN always passes.
 * IMPORTANT: Only use on READ/visualization endpoints. Never on data ingestion.
 */
const creditCheckMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.company.companyId;
        const role = req.company.role;
        // SUPER_ADMIN always has access
        if (role === 'SUPER_ADMIN') {
            next();
            return;
        }
        const company = yield db_1.default.company.findUnique({
            where: { id: companyId },
            select: { credits: true, bonusCredits: true, role: true },
        });
        if (!company) {
            res.status(404).json({ error: 'Company not found' });
            return;
        }
        if (!(0, creditService_1.hasCredits)(company)) {
            res.status(402).json({
                error: 'Sin créditos disponibles',
                code: 'NO_CREDITS',
                message: 'Tu cuenta no tiene créditos. Los datos se siguen recolectando, pero necesitás créditos para visualizar el mapa y los recorridos.',
            });
            return;
        }
        next();
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.creditCheckMiddleware = creditCheckMiddleware;
