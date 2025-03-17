import dotenv from "dotenv";

import { DockerService } from "./services/Docker";
import { ContainerController } from "./controllers/ContainerController";
import { Application } from "./services/Server";

dotenv.config();

const dockerService = new DockerService();
const containerController = new ContainerController(dockerService);
const application = new Application(containerController);

application.start();
