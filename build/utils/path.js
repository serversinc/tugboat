"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBaseDirectory = getBaseDirectory;
exports.getTargetDirectory = getTargetDirectory;
const path_1 = __importDefault(require("path"));
/**
 * Get the base directory based on platform
 * @returns {string} Base directory path
 */
function getBaseDirectory() {
    return path_1.default.resolve(process.cwd(), "../tugboat");
}
function getTargetDirectory(repoName) {
    const baseDir = getBaseDirectory();
    return path_1.default.join(baseDir, repoName);
}
