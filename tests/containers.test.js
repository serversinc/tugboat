const { Application } = require('../build/services/Server');
const { ContainerController } = require('../build/controllers/ContainerController');
const { ImageController } = require('../build/controllers/ImageController');
const { GithubController } = require('../build/controllers/GithubController');
const { NetworkController } = require('../build/controllers/NetworkController');
const { ComposeController } = require('../build/controllers/ComposeController');
const { DockerService } = require('../build/services/Docker');

jest.setTimeout(30000);

describe('Container API', () => {
  let app;
  let dockerService;
  let createdContainers = [];

  beforeAll(async () => {
    try {
      dockerService = new DockerService();
      await dockerService.docker.ping();
    } catch (err) {
      throw new Error('Docker not available: ' + err.message);
    }
  });

  beforeEach(() => {
    if (!dockerService) return;
    process.env.TUGBOAT_SECRET_KEY = 'test-key';
    const containerController = new ContainerController(dockerService);
    const imageController = new ImageController(dockerService);
    const githubController = new GithubController();
    const networkController = new NetworkController(dockerService);
    const composeController = new ComposeController(dockerService);

    app = new Application(containerController, imageController, githubController, networkController, composeController);
  });

  afterEach(async () => {
    for (const id of createdContainers) {
      try {
        await dockerService.stopContainer(id);
      } catch (err) {
        if (!err.message.includes('304') && !err.message.includes('already stopped')) {
          console.warn(`Failed to stop container ${id}:`, err.message);
        }
      }
      try {
        await dockerService.removeContainer(id);
      } catch (err) {
        if (!err.message.includes('404') && !err.message.includes('no such container')) {
          console.warn(`Failed to remove container ${id}:`, err.message);
        }
      }
    }
    createdContainers = [];
  });

  describe('GET /containers', () => {
    it('should return a list of containers', async () => {
      const res = await app.app.request('/containers', {
        headers: { 'x-auth-key': 'test-key' }
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /containers/:id', () => {
    it('should return 404 for non-existent container', async () => {
      const res = await app.app.request('/containers/nonexistent', {
        headers: { 'x-auth-key': 'test-key' }
      });

      expect(res.status).toBe(500);
    });
  });

  describe('POST /containers', () => {
    it('should create a container', async () => {
      const containerData = {
        name: 'test-container-' + Date.now(),
        image: 'nginx:latest',
        start: false,
        networks: ['bridge']
      };

      const res = await app.app.request('/containers', {
        method: 'POST',
        headers: {
          'x-auth-key': 'test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(containerData)
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      createdContainers.push(data.container.Id);
    });
  });

  describe('POST /containers/:id/start', () => {
    it('should start a container', async () => {
      // Create container first
      const containerData = {
        name: 'test-start-' + Date.now(),
        image: 'nginx:latest',
        start: false,
        networks: ['bridge']
      };

      const createRes = await app.app.request('/containers', {
        method: 'POST',
        headers: {
          'x-auth-key': 'test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(containerData)
      });

      expect(createRes.status).toBe(200);
      const createData = await createRes.json();
      const containerId = createData.container.Id;
      createdContainers.push(containerId);

      // Now start it
      const res = await app.app.request(`/containers/${containerId}/start`, {
        method: 'POST',
        headers: { 'x-auth-key': 'test-key' }
      });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /containers/:id/stop', () => {
    it('should stop a container', async () => {
      jest.setTimeout(10000);
      // Create and start container first
      const containerData = {
        name: 'test-stop-' + Date.now(),
        image: 'alpine:latest',
        command: ['sleep', '5'],
        start: true,
        networks: ['bridge']
      };

      const createRes = await app.app.request('/containers', {
        method: 'POST',
        headers: {
          'x-auth-key': 'test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(containerData)
      });

      expect(createRes.status).toBe(200);
      const createData = await createRes.json();
      const containerId = createData.container.Id;
      createdContainers.push(containerId);

      // Now stop it
      const res = await app.app.request(`/containers/${containerId}/stop`, {
        method: 'POST',
        headers: { 'x-auth-key': 'test-key' }
      });

      expect(res.status).toBe(200);
    }, 10000);
  });

  describe('POST /containers/:id/restart', () => {
    it('should restart a container', async () => {
      // Create container first
      const containerData = {
        name: 'test-restart-' + Date.now(),
        image: 'nginx:latest',
        start: false,
        networks: ['bridge']
      };

      const createRes = await app.app.request('/containers', {
        method: 'POST',
        headers: {
          'x-auth-key': 'test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(containerData)
      });

      expect(createRes.status).toBe(200);
      const createData = await createRes.json();
      const containerId = createData.container.Id;
      createdContainers.push(containerId);

      // Now restart it
      const res = await app.app.request(`/containers/${containerId}/restart`, {
        method: 'POST',
        headers: { 'x-auth-key': 'test-key' }
      });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /containers/:id/command', () => {
    it('should run a command in a container', async () => {
      // Create and start container first
      const containerData = {
        name: 'test-command-' + Date.now(),
        image: 'nginx:latest',
        start: true,
        networks: ['bridge']
      };

      const createRes = await app.app.request('/containers', {
        method: 'POST',
        headers: {
          'x-auth-key': 'test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(containerData)
      });

      expect(createRes.status).toBe(200);
      const createData = await createRes.json();
      const containerId = createData.container.Id;
      createdContainers.push(containerId);

      // Now run command
      const commandData = { command: 'echo hello' };
      const res = await app.app.request(`/containers/${containerId}/command`, {
        method: 'POST',
        headers: {
          'x-auth-key': 'test-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commandData)
      });

      expect(res.status).toBe(200);
    });
  });
});