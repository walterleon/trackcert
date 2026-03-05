"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminMiddleware = exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!(authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer '))) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const token = authHeader.slice(7);
    try {
        req.company = (0, jwt_1.verifyToken)(token);
        next();
    }
    catch (_a) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};
exports.authMiddleware = authMiddleware;
const superAdminMiddleware = (req, res, next) => {
    var _a;
    if (((_a = req.company) === null || _a === void 0 ? void 0 : _a.role) !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Forbidden: super admin only' });
        return;
    }
    next();
};
exports.superAdminMiddleware = superAdminMiddleware;
