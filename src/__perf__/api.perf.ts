import autocannon, { Result } from 'autocannon';
import app from '../app';
import { supabase } from '../lib/supabase';

const server = app.listen(3001);

// Mock Supabase for performance tests
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: {
        id: 'test-id',
        title: 'Test Post',
        content: 'Test content',
        created_at: new Date().toISOString()
      },
      error: null
    })
  }
}));

describe('API Performance Tests', () => {
  afterAll(() => {
    server.close();
  });

  it('should handle high load on post listing endpoint', async () => {
    const results = await autocannon({
      url: 'http://localhost:3001/api/posts/project/test-project',
      connections: 100,
      duration: 10,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    }) as Result;

    // Assertions for performance metrics
    expect(results.errors).toBe(0);
    expect(results.timeouts).toBe(0);
    expect(results.non2xx).toBe(0);
    expect(results.latency.p99).toBeLessThan(500); // 99th percentile should be under 500ms
    expect(results.requests.average).toBeGreaterThan(500); // Should handle at least 500 req/sec
  });

  it('should handle multiple concurrent post creations', async () => {
    const results = await autocannon({
      url: 'http://localhost:3001/api/posts',
      connections: 50,
      duration: 10,
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({
        projectId: 'test-project',
        title: 'Performance Test Post',
        content: 'Test content',
        contentType: 'text',
        categories: ['test'],
        clientPostId: 'perf-test-1'
      })
    }) as Result;

    expect(results.errors).toBe(0);
    expect(results.timeouts).toBe(0);
    expect(results.non2xx).toBe(0);
    expect(results.latency.p99).toBeLessThan(1000); // 99th percentile should be under 1s
    expect(results.requests.average).toBeGreaterThan(100); // Should handle at least 100 writes/sec
  });

  it('should handle high load on comment listing endpoint', async () => {
    const results = await autocannon({
      url: 'http://localhost:3001/api/comments/thread/test-comment',
      connections: 100,
      duration: 10,
      headers: {
        'Authorization': 'Bearer test-token'
      }
    }) as Result;

    expect(results.errors).toBe(0);
    expect(results.timeouts).toBe(0);
    expect(results.latency.p99).toBeLessThan(300); // Comments should be very fast to load
    expect(results.requests.average).toBeGreaterThan(1000); // Should handle 1000+ reads/sec
  });
});