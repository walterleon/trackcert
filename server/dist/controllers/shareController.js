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
exports.getShareData = void 0;
const db_1 = __importDefault(require("../db"));
const getShareData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { token } = req.params;
    const { pin } = req.query;
    if (!pin) {
        res.status(400).json({ error: 'PIN is required' });
        return;
    }
    try {
        const campaign = yield db_1.default.campaign.findUnique({
            where: { shareToken: token },
            include: {
                company: { select: { name: true } },
                drivers: {
                    where: { isActive: true },
                    include: {
                        locations: {
                            orderBy: { timestamp: 'desc' },
                            take: 1,
                        },
                    },
                },
            },
        });
        if (!campaign) {
            res.status(404).json({ error: 'Share link not found or expired' });
            return;
        }
        if (campaign.sharePin !== String(pin)) {
            res.status(401).json({ error: 'Invalid PIN' });
            return;
        }
        res.json({
            campaignId: campaign.id,
            title: campaign.title,
            companyName: campaign.company.name,
            isActive: campaign.isActive,
            drivers: campaign.drivers.map((d) => {
                var _a;
                return ({
                    id: d.id,
                    alias: d.alias,
                    lastSeenAt: d.lastSeenAt,
                    lastLocation: (_a = d.locations[0]) !== null && _a !== void 0 ? _a : null,
                });
            }),
        });
    }
    catch (_a) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getShareData = getShareData;
