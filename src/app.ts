import dotenv from "dotenv";

// Hono Server
import { Application } from "./services/Server";

// Controllers
import { ContainerController } from "./controllers/ContainerController";
import { ImageController } from "./controllers/ImageController";

// Services
import { DockerService } from "./services/Docker";
import { HeartbeatService } from "./services/Heartbeat";
import { checkEnv } from "./utils/env";
import { GithubController } from "./controllers/GithubController";

dotenv.config();
checkEnv();

const dockerService = new DockerService();
const heartbeat = new HeartbeatService(dockerService);

// Start phone home interval
if (process.env.TUGBOAT_PHONE_HOME_INTERVAL && process.env.TUGBOAT_PHONE_HOME_URL) {
  heartbeat.start();
}

const containerController = new ContainerController(dockerService);
const imageController = new ImageController(dockerService);
const githubController = new GithubController();

const application = new Application(containerController, imageController, githubController);

application.start();
