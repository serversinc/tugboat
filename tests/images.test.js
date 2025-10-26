const { Application } = require("../build/services/Server");
const { ContainerController } = require("../build/controllers/ContainerController");
const { ImageController } = require("../build/controllers/ImageController");
const { GithubController } = require("../build/controllers/GithubController");
const { NetworkController } = require("../build/controllers/NetworkController");
const { ComposeController } = require("../build/controllers/ComposeController");
const { DockerService } = require("../build/services/Docker");
const fs = require("fs");
const path = require("path");
const os = require("os");

describe("Image API", () => {
  let app;
  let dockerService;
  let createdDirs = [];
  let createdImages = [];

  beforeAll(async () => {
    try {
      dockerService = new DockerService();
      await dockerService.docker.ping();
    } catch (err) {
      throw new Error("Docker not available: " + err.message);
    }
  });

  beforeEach(() => {
    if (!dockerService) return;
    process.env.TUGBOAT_SECRET_KEY = "test-key";
    const containerController = new ContainerController(dockerService);
    const imageController = new ImageController(dockerService);
    const githubController = new GithubController();
    const networkController = new NetworkController(dockerService);
    const composeController = new ComposeController(dockerService);

    app = new Application(containerController, imageController, githubController, networkController, composeController);
  });

  afterEach(async () => {
    // Clean up created directories
    createdDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        fs.rmdirSync(dir, { recursive: true });
      }
    });
    createdDirs = [];

    // Clean up created images
    for (const id of createdImages) {
      try {
        await dockerService.removeImage(id);
      } catch (err) {
        if (!err.message.includes("404") && !err.message.includes("no such image")) {
          console.warn(`Failed to remove image ${id}:`, err.message);
        }
      }
    }
    createdImages = [];
  });

  describe("GET /images", () => {
    it("should return a list of images", async () => {
      const res = await app.app.request("/images", {
        headers: { "x-auth-key": "test-key" },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("POST /images", () => {
    it("should build an image from a GitHub repository", async () => {
      jest.setTimeout(120000);
      // Ensure required images are available
      await dockerService.pullImage("alpine/git");
      await dockerService.pullImage("buildpacksio/pack");

      const imageData = {
        name: "dmdboi/test-express-api",
        tag: "test-" + Date.now(),
        token: "dummy",
      };

      const res = await app.app.request("/images", {
        method: "POST",
        headers: {
          "x-auth-key": "test-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(imageData),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
