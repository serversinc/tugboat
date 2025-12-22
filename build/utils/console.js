"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.success = success;
const chalk_1 = __importDefault(require("chalk"));
function info(prefix, message) {
    console.log(chalk_1.default.blueBright(`[ ${prefix} ]`), message);
}
function warn(prefix, message) {
    console.warn(chalk_1.default.yellow(`[ ${prefix} ]`), message);
}
function error(prefix, message) {
    console.error(chalk_1.default.red(`[ ${prefix} ]`), message);
}
function success(prefix, message) {
    console.log(chalk_1.default.green(`[ ${prefix} ]`), message);
}
