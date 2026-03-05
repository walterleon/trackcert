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
exports.getMe = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const jwt_1 = require("../utils/jwt");
function safeCompany(c) {
    return { id: c.id, name: c.name, email: c.email, role: c.role, planName: c.planName, credits: c.credits };
}
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existing = yield db_1.default.company.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        const passwordHash = yield bcryptjs_1.default.hash(password, 10);
        const company = yield db_1.default.company.create({
            data: { name, email, passwordHash },
        });
        const token = (0, jwt_1.signToken)({ companyId: company.id, role: company.role });
        res.status(201).json({ token, company: safeCompany(company) });
    }
    catch (error) {
        console.error('register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    try {
        const company = yield db_1.default.company.findUnique({ where: { email } });
        if (!company || !company.passwordHash) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const valid = yield bcryptjs_1.default.compare(password, company.passwordHash);
        if (!valid) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const token = (0, jwt_1.signToken)({ companyId: company.id, role: company.role });
        res.json({ token, company: safeCompany(company) });
    }
    catch (error) {
        console.error('login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.login = login;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const company = yield db_1.default.company.findUnique({
            where: { id: req.company.companyId },
            select: { id: true, name: true, email: true, role: true, planName: true, credits: true, createdAt: true },
        });
        if (!company) {
            res.status(404).json({ error: 'Company not found' });
            return;
        }
        res.json(company);
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getMe = getMe;
