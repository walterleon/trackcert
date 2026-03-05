"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCampaignCode = generateCampaignCode;
exports.generateValidationCode = generateValidationCode;
exports.generateShareToken = generateShareToken;
exports.generateSharePin = generateSharePin;
const crypto_1 = require("crypto");
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generateCampaignCode() {
    let code = 'CAMP-';
    for (let i = 0; i < 6; i++) {
        code += CHARS[(0, crypto_1.randomInt)(CHARS.length)];
    }
    return code;
}
function generateValidationCode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += CHARS[(0, crypto_1.randomInt)(CHARS.length)];
    }
    return code;
}
function generateShareToken() {
    return (0, crypto_1.randomBytes)(20).toString('hex');
}
function generateSharePin() {
    return String((0, crypto_1.randomInt)(1000, 9999));
}
