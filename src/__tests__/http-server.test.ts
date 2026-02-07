import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

describe('HTTP Server', () => {
  let serverProcess: ChildProcess;
  let serverPort: number;
  let serverUrl: string;

  beforeAll(async () => {
    // Use a random port for testing to avoid conflicts
    serverPort = 30000 + Math.floor(Math.random() * 10000);
    serverUrl = `http://localhost:${serverPort}`;

    // Spawn the HTTP server as a child process
    serverProcess = spawn('tsx', ['src/http-server.ts'], {
      env: {
        ...process.env,
        PORT: serverPort.toString(),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Server failed to start within 10 seconds'));
      }, 10000);

      serverProcess.stderr?.on('data', (data: Buffer) => {
        const message = data.toString();
        if (message.includes('listening on port')) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          clearTimeout(timeout);
          reject(new Error(`Server exited with code ${code}`));
        }
      });
    });

    // Give the server a moment to fully initialize
    await sleep(500);
  }, 15000); // 15 second timeout for beforeAll

  afterAll(async () => {
    // Kill the server process
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        serverProcess.on('exit', () => resolve());
        sleep(1000).then(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve();
        });
      });
    }
  }, 10000); // 10 second timeout for afterAll

  describe('Health Check Endpoint', () => {
    it('should return 200 OK with status information', async () => {
      const response = await fetch(`${serverUrl}/health`);

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('server', 'stride-patterns-mcp');
      expect(data).toHaveProperty('version', '0.2.0');
    });
  });

  describe('CORS Headers', () => {
    it('should return proper CORS headers on OPTIONS request', async () => {
      const response = await fetch(`${serverUrl}/health`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toContain('GET');
      expect(response.headers.get('access-control-allow-methods')).toContain('POST');
      expect(response.headers.get('access-control-allow-methods')).toContain('DELETE');
      expect(response.headers.get('access-control-allow-headers')).toContain('Content-Type');
      expect(response.headers.get('access-control-allow-headers')).toContain('mcp-session-id');
    });

    it('should include CORS headers on regular requests', async () => {
      const response = await fetch(`${serverUrl}/health`);

      expect(response.headers.get('access-control-allow-origin')).toBe('*');
      expect(response.headers.get('access-control-allow-methods')).toBeTruthy();
    });
  });

  describe('Unknown Paths', () => {
    it('should return 404 for unknown paths', async () => {
      const response = await fetch(`${serverUrl}/unknown`);

      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toContain('application/json');

      const data = await response.json();
      expect(data).toHaveProperty('error', 'Not found');
    });

    it('should return 404 for random paths', async () => {
      const response = await fetch(`${serverUrl}/random/path/that/does/not/exist`);

      expect(response.status).toBe(404);
    });
  });

  describe('MCP Endpoint', () => {
    it('should exist and not return 404', async () => {
      // POST to /mcp without proper MCP protocol data will likely error,
      // but it should NOT return 404 (which would indicate the endpoint doesn't exist)
      const response = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // We expect some response (could be 200, 400, 500, etc.) but NOT 404
      expect(response.status).not.toBe(404);
    });

    it('should accept GET requests', async () => {
      const response = await fetch(`${serverUrl}/mcp`, {
        method: 'GET',
      });

      // Should not return 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });

    it('should accept DELETE requests', async () => {
      const response = await fetch(`${serverUrl}/mcp`, {
        method: 'DELETE',
      });

      // Should not return 404 (endpoint exists)
      expect(response.status).not.toBe(404);
    });

    it('should handle mcp-session-id header', async () => {
      const sessionId = 'test-session-' + Math.random().toString(36).substring(7);

      const response = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'mcp-session-id': sessionId,
        },
        body: JSON.stringify({}),
      });

      // Should not return 404
      expect(response.status).not.toBe(404);

      // Response should expose mcp-session-id header (via Access-Control-Expose-Headers)
      expect(response.headers.get('access-control-expose-headers')).toContain('mcp-session-id');
    });
  });

  describe('Server Configuration', () => {
    it('should use the PORT environment variable', async () => {
      // This is verified by the beforeAll setup - if the server starts on the specified port,
      // it means it's respecting the PORT environment variable
      const response = await fetch(`${serverUrl}/health`);
      expect(response.status).toBe(200);
    });
  });
});
