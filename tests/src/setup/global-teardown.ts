/**
 * Global Jest teardown - runs once after all tests
 */

import { ChildProcess } from 'child_process';

export default async function globalTeardown() {
  console.log('🛑 Shutting down test environment...');

  // Get services from global setup
  const services: ChildProcess[] = (global as any).__TEST_SERVICES__ || [];

  // Gracefully shutdown services
  for (const service of services) {
    if (service && !service.killed) {
      console.log(`Stopping service (PID: ${service.pid})`);
      service.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (!service.killed) {
            console.log(`Force killing service (PID: ${service.pid})`);
            service.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        service.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  }

  console.log('✅ Test environment shutdown complete');
}