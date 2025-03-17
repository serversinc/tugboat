# Tugboat

A node.js agent for managing remote Docker containers.

## Features

- 💚 Health check
- 🚢 Container management

## Setup

1. Pull the latest image from Docker Hub:

```bash
docker pull serversinc/tugboat
```

2. Create a `.env` file in the root directory with the following content:

```env
TUGBOAT_PORT=7567
TUGBOAT_SECRET_KEY=your_secret_key
TUGBOAT_PHONE_HOME_INTERVAL=60000
TUGBOAT_PHONE_HOME_URL=http://your_server:your_port/events
```

3. Run the image:

```bash
docker run -d -p 7567:7567 serversinc/tugboat --env-file .env
```

## Usage

### Fetch health status

```bash
curl -X GET http://localhost:7567/v1/health
```

### Fetch all containers

```bash
curl -X GET http://localhost:7567/v1/containers
```

### Fetch a container by ID

```bash
curl -X GET http://localhost:7567/v1/containers/:id
```

## Environment variables

- `TUGBOAT_PORT`: Listening port for the agent
- `TUGBOAT_SECRET_KEY`: The secret key for authenticating requests to the agent
- `TUGBOAT_PHONE_HOME_INTERVAL`: The interval at which the agent will send a heartbeat to your server.
- `TUGBOAT_PHONE_HOME_URL`: The URL to which the agent will send a heartbeat.

## Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature`)
3. Commit your changes (`git commit -am 'Add feature'`)
4. Push to the branch (`git push origin feature`)
5. Create a new pull request
