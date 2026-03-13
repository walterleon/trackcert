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
exports.deletePhoto = exports.uploadPhoto = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = __importDefault(require("../db"));
const uploadPhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { driverId, latitude, longitude, accuracy } = req.body;
    const file = req.file;
    if (!file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    if (!driverId || latitude === undefined || longitude === undefined) {
        res.status(400).json({ error: 'driverId, latitude and longitude are required' });
        return;
    }
    try {
        const driver = yield db_1.default.driver.findUnique({
            where: { id: driverId },
            include: { campaign: true },
        });
        if (!driver) {
            res.status(401).json({ error: 'Invalid driver' });
            return;
        }
        const fileUrl = `/uploads/${file.filename}`;
        const photo = yield db_1.default.photo.create({
            data: {
                driverId,
                campaignId: driver.campaignId,
                companyId: driver.campaign.companyId,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                accuracy: accuracy != null ? parseFloat(accuracy) : undefined,
                filePath: file.path,
                fileUrl,
            },
        });
        // Update driver last seen
        yield db_1.default.driver.update({
            where: { id: driverId },
            data: { lastSeenAt: new Date() },
        });
        // Notify campaign room in real time
        const io = req.app.get('io');
        if (io) {
            io.to(`campaign:${driver.campaignId}`).emit('photo-uploaded', {
                driverId,
                alias: driver.alias,
                photo: Object.assign({}, photo),
            });
        }
        res.json({ success: true, photo });
    }
    catch (error) {
        console.error('uploadPhoto error:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});
exports.uploadPhoto = uploadPhoto;
// ─── Company: delete photo ──────────────────────────────────────────────────
const deletePhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { campaignId, photoId } = req.params;
    const companyId = req.company.companyId;
    try {
        const photo = yield db_1.default.photo.findFirst({
            where: { id: photoId, campaignId, companyId },
        });
        if (!photo) {
            res.status(404).json({ error: 'Photo not found' });
            return;
        }
        // Delete file from disk
        const filePath = photo.filePath || path_1.default.join(process.cwd(), 'uploads', path_1.default.basename(photo.fileUrl));
        try {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        catch (fsErr) {
            console.error('deletePhoto: failed to remove file', filePath, fsErr);
        }
        // Delete from database
        yield db_1.default.photo.delete({ where: { id: photoId } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('deletePhoto error:', error);
        res.status(500).json({ error: 'Failed to delete photo' });
    }
});
exports.deletePhoto = deletePhoto;
