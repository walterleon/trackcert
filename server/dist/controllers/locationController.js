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
exports.ingestLocations = void 0;
const db_1 = __importDefault(require("../db"));
const ingestLocations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { driverId, locations } = req.body;
    if (!driverId || !Array.isArray(locations) || locations.length === 0) {
        res.status(400).json({ error: 'driverId and non-empty locations array required' });
        return;
    }
    try {
        const driver = yield db_1.default.driver.findUnique({
            where: { id: driverId },
            include: { campaign: { select: { isActive: true } } },
        });
        if (!driver) {
            res.status(401).json({ error: 'Invalid driver ID' });
            return;
        }
        if (!driver.campaign.isActive) {
            res.status(403).json({ error: 'Campaign is not active', code: 'CAMPAIGN_INACTIVE' });
            return;
        }
        const entries = locations.map((loc) => {
            var _a, _b;
            return ({
                driverId,
                campaignId: driver.campaignId,
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: (_a = loc.accuracy) !== null && _a !== void 0 ? _a : null,
                batteryLevel: (_b = loc.batteryLevel) !== null && _b !== void 0 ? _b : null,
                timestamp: new Date(loc.timestamp),
                isOfflineSync: loc.isOfflineSync || false,
            });
        });
        const result = yield db_1.default.location.createMany({ data: entries });
        // Update driver last seen
        yield db_1.default.driver.update({
            where: { id: driverId },
            data: { lastSeenAt: new Date(), isActive: true },
        });
        // Broadcast last location to campaign room via Socket.io
        const lastLoc = entries[entries.length - 1];
        const io = req.app.get('io');
        if (io) {
            io.to(`campaign:${driver.campaignId}`).emit('driver-moved', {
                driverId,
                alias: driver.alias,
                campaignId: driver.campaignId,
                latitude: lastLoc.latitude,
                longitude: lastLoc.longitude,
                accuracy: lastLoc.accuracy,
                batteryLevel: lastLoc.batteryLevel,
                timestamp: lastLoc.timestamp,
            });
        }
        res.json({ success: true, count: result.count });
    }
    catch (error) {
        console.error('ingestLocations error:', error);
        res.status(500).json({ error: 'Failed to ingest locations' });
    }
});
exports.ingestLocations = ingestLocations;
