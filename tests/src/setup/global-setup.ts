/**
 * Global Jest setup - runs once before all tests
 */

import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

let services: ChildProcess[] = [];

export default async function globalSetup() {
  console.log('🚀 Starting MCP Tools integration test environment...');

  // Clean up any existing test databases
  await cleanupTestDatabases();

  // Build all components first
  await buildComponents();

  // Start services in correct order
  await startServices();

  // Wait for services to be ready
  await waitForServices();

  console.log('✅ Test environment ready');
}

async function cleanupTestDatabases() {
  console.log('🧹 Cleaning up test databases...');
  
  // PostgreSQL databases are managed by the database server
  // No local files to clean up
  console.log('PostgreSQL databases will be cleaned by migrations service');
}

async function buildComponents() {
  console.log('🔨 Building components...');
  
  const buildCommands = [
    { cwd: '../core', cmd: 'npm', args: ['run', 'build'] },
    { cwd: '../workers/embeddings', cmd: 'npm', args: ['run', 'build'] },
    { cwd: '../gateway', cmd: 'npm', args: ['run', 'build'] },
  ];

  for (const { cwd, cmd, args } of buildCommands) {
    await new Promise<void>((resolve, reject) => {
      const process = spawn(cmd, args, { 
        cwd, 
        stdio: 'inherit',
        shell: true 
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build failed for ${cwd} with code ${code}`));
        }
      });
    });
  }
}

async function startServices() {
  console.log('🎬 Starting services...');

  // Start API Gateway
  const gateway = spawn('node', ['dist/index.js'], {
    cwd: '../gateway',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: '3001', // Use different port for testing
      DATABASE_URL: 'postgresql://postgres:password@localhost:5432/mcp_tools_test',
    },
    stdio: 'pipe'
  });

  services.push(gateway);

  // Start Embeddings Worker
  const embeddings = spawn('node', ['dist/index.js'], {
    cwd: '../workers/embeddings',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      EMBEDDING_PROVIDER: 'ollama',
      OLLAMA_BASE_URL: 'http://localhost:11434',
    },
    stdio: 'pipe'
  });

  services.push(embeddings);

  // Store service PIDs for cleanup
  (global as any).__TEST_SERVICES__ = services;
}

async function waitForServices() {
  console.log('⏳ Waiting for services to be ready...');
  
  // Wait for gateway health check
  const maxRetries = 30;
  const retryDelay = 1000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:3001/api/health');
      if (response.ok) {
        console.log('✅ Gateway is ready');
        break;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw new Error('Gateway failed to start within timeout');
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }

  // Give workers a moment to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));
}