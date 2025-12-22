"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = require("../services/Server");
const ContainerController_1 = require("../controllers/ContainerController");
const ImageController_1 = require("../controllers/ImageController");
const GithubController_1 = require("../controllers/GithubController");
const NetworkController_1 = require("../controllers/NetworkController");
const ComposeController_1 = require("../controllers/ComposeController");
// Mock the DockerService
jest.mock('../services/Docker', () => {
    return {
        DockerService: jest.fn().mockImplementation(() => ({
            listContainers: jest.fn().mockResolvedValue([
                { Id: '123', Names: ['/test-container'], State: 'running' }
            ]),
            getContainer: jest.fn().mockResolvedValue({
                Id: '123', Name: '/test-container', State: { Status: 'running' }
            }),
            createContainer: jest.fn().mockResolvedValue({ id: '123' }),
            startContainer: jest.fn().mockResolvedValue(undefined),
            removeContainer: jest.fn().mockResolvedValue(undefined),
            restartContainer: jest.fn().mockResolvedValue(undefined),
            stopContainer: jest.fn().mockResolvedValue(undefined),
            checkImageExists: jest.fn().mockResolvedValue(true),
            pullImage: jest.fn().mockResolvedValue(undefined),
        })),
    };
});
const DockerService = require('../services/Docker').DockerService;
describe('Container API', () => {
    let app;
    let dockerService;
    beforeEach(() => {
        process.env.TUGBOAT_SECRET_KEY = 'test-key';
        dockerService = new DockerService();
        const containerController = new ContainerController_1.ContainerController(dockerService);
        const imageController = new ImageController_1.ImageController(dockerService);
        const githubController = new GithubController_1.GithubController();
        const networkController = new NetworkController_1.NetworkController(dockerService);
        const composeController = new ComposeController_1.ComposeController(dockerService);
        app = new Server_1.Application(containerController, imageController, githubController, networkController, composeController);
    });
    describe('GET /containers', () => {
        it('should return a list of containers', async () => {
            const res = await app.app.request('/containers', {
                headers: { 'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key' }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data).toEqual([
                { Id: '123', Names: ['/test-container'], State: 'running' }
            ]);
        });
    });
    describe('GET /containers/:id', () => {
        it('should return a container by id', async () => {
            const res = await app.app.request('/containers/123', {
                headers: { 'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key' }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.Id).toBe('123');
        });
    });
    describe('POST /containers', () => {
        it('should create a container', async () => {
            const containerData = {
                name: 'test-container',
                image: 'nginx:latest',
                start: true
            };
            const res = await app.app.request('/containers', {
                method: 'POST',
                headers: {
                    'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(containerData)
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.success).toBe(true);
        });
    });
    describe('DELETE /containers/:id', () => {
        it('should remove a container', async () => {
            const res = await app.app.request('/containers/123', {
                method: 'DELETE',
                headers: { 'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key' }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.message).toBe('Container removed');
        });
    });
    describe('POST /containers/:id/start', () => {
        it('should start a container', async () => {
            const res = await app.app.request('/containers/123/start', {
                method: 'POST',
                headers: { 'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key' }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.message).toBe('Container started');
        });
    });
    describe('POST /containers/:id/stop', () => {
        it('should stop a container', async () => {
            const res = await app.app.request('/containers/123/stop', {
                method: 'POST',
                headers: { 'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key' }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.message).toBe('Container stopped');
        });
    });
    describe('POST /containers/:id/restart', () => {
        it('should restart a container', async () => {
            const res = await app.app.request('/containers/123/restart', {
                method: 'POST',
                headers: { 'x-auth-key': process.env.TUGBOAT_SECRET_KEY || 'test-key' }
            });
            expect(res.status).toBe(200);
            const data = await res.json();
            expect(data.message).toBe('Container restarted');
        });
    });
});
