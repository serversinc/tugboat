"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Hono Server
const Server_1 = require("./services/Server");
// Controllers
const ContainerController_1 = require("./controllers/ContainerController");
const GithubController_1 = require("./controllers/GithubController");
const ImageController_1 = require("./controllers/ImageController");
const ComposeController_1 = require("./controllers/ComposeController");
// Services
const Heartbeat_1 = require("./services/Heartbeat");
const Docker_1 = require("./services/Docker");
const auth_1 = require("./utils/auth");
const env_1 = require("./utils/env");
const NetworkController_1 = require("./controllers/NetworkController");
const Watcher_1 = require("./services/Watcher");
dotenv_1.default.config();
(0, env_1.checkEnv)();
(0, auth_1.ensureSecretKey)();
const dockerService = new Docker_1.DockerService();
const watcherService = new Watcher_1.WatcherService(dockerService);
const heartbeat = new Heartbeat_1.HeartbeatService(dockerService);
watcherService.start();
heartbeat.start();
const containerController = new ContainerController_1.ContainerController(dockerService);
const networkController = new NetworkController_1.NetworkController(dockerService);
const imageController = new ImageController_1.ImageController(dockerService);
const githubController = new GithubController_1.GithubController();
const composeController = new ComposeController_1.ComposeController(dockerService);
const application = new Server_1.Application(containerController, imageController, githubController, networkController, composeController);
application.start();
