import { MemoryCache, CacheEntry } from '../../modules/MemoryCache'

// Mock timers for TTL testing
jest.useFakeTimers()

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache(3) // Small cache for testing eviction
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('should check if key exists', () => {
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('should delete keys', () => {
      cache.set('key1', 'value1')
      expect(cache.delete('key1')).toBe(true)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.delete('nonexistent')).toBe(false)
    })

    it('should clear all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
    })

    it('should return correct size', () => {
      expect(cache.size()).toBe(0)
      cache.set('key1', 'value1')
      expect(cache.size()).toBe(1)
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)
    })

    it('should return all keys', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      const keys = cache.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys.length).toBe(2)
    })
  })

  describe('LRU Eviction', () => {
    it('should evict least recently used item when cache is full', () => {
      // Fill cache to capacity
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // Access key1 to make it recently used
      cache.get('key1')
      
      // Add new item, should evict key2 (least recently used)
      cache.set('key4', 'value4')
      
      expect(cache.get('key1')).toBe('value1') // Still exists
      expect(cache.get('key2')).toBeUndefined() // Evicted
      expect(cache.get('key3')).toBe('value3') // Still exists
      expect(cache.get('key4')).toBe('value4') // New item
    })

    it('should update access order on get', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // Access key1 to make it most recently used
      cache.get('key1')
      
      // Add new item, should evict key2
      cache.set('key4', 'value4')
      
      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBeUndefined()
    })

    it('should update access order on set for existing key', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // Update key1 to make it most recently used
      cache.set('key1', 'updated_value1')
      
      // Add new item, should evict key2
      cache.set('key4', 'value4')
      
      expect(cache.get('key1')).toBe('updated_value1')
      expect(cache.get('key2')).toBeUndefined()
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cache.set('key1', 'value1', 1000) // 1 second TTL
      
      expect(cache.get('key1')).toBe('value1')
      
      // Fast forward time
      jest.advanceTimersByTime(1001)
      
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.has('key1')).toBe(false)
    })

    it('should not expire entries without TTL', () => {
      cache.set('key1', 'value1') // No TTL
      
      // Fast forward time significantly
      jest.advanceTimersByTime(10000)
      
      expect(cache.get('key1')).toBe('value1')
    })

    it('should update TTL for existing entries', () => {
      cache.set('key1', 'value1', 1000)
      
      // Update TTL before expiration
      jest.advanceTimersByTime(500)
      expect(cache.updateTTL('key1', 2000)).toBe(true)
      
      // Original TTL would have expired, but new TTL should keep it alive
      jest.advanceTimersByTime(1000)
      expect(cache.get('key1')).toBe('value1')
      
      // New TTL should expire
      jest.advanceTimersByTime(1500)
      expect(cache.get('key1')).toBeUndefined()
    })

    it('should return false when updating TTL for non-existent key', () => {
      expect(cache.updateTTL('nonexistent', 1000)).toBe(false)
    })
  })

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', 'value1')
      
      // Hit
      cache.get('key1')
      
      // Miss
      cache.get('nonexistent')
      
      const stats = cache.getStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)
    })

    it('should track evictions', () => {
      // Fill cache beyond capacity to trigger evictions
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      cache.set('key4', 'value4') // Should evict key1
      
      const stats = cache.getStats()
      expect(stats.evictions).toBe(1)
    })

    it('should calculate hit rate correctly', () => {
      cache.set('key1', 'value1')
      
      // 3 hits, 2 misses = 60% hit rate
      cache.get('key1')
      cache.get('key1')
      cache.get('key1')
      cache.get('nonexistent1')
      cache.get('nonexistent2')
      
      const stats = cache.getStats()
      expect(stats.hitRate).toBe(0.6)
    })

    it('should handle zero requests for hit rate', () => {
      const stats = cache.getStats()
      expect(stats.hitRate).toBe(0)
    })
  })

  describe('Batch Operations', () => {
    it('should set multiple values', () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
        ['key3', 'value3']
      ])
      
      cache.setMultiple(entries)
      
      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
    })

    it('should set multiple values with TTL', () => {
      const entries = new Map([
        ['key1', 'value1'],
        ['key2', 'value2']
      ])
      
      cache.setMultiple(entries, 1000)
      
      jest.advanceTimersByTime(1001)
      
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBeUndefined()
    })

    it('should get multiple values', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      const results = cache.getMultiple(['key1', 'key2', 'nonexistent'])
      
      expect(results.get('key1')).toBe('value1')
      expect(results.get('key2')).toBe('value2')
      expect(results.has('nonexistent')).toBe(false)
    })
  })

  describe('Pattern Matching', () => {
    it('should get entries by pattern', () => {
      cache.set('user:1', { id: 1, name: 'John' })
      cache.set('user:2', { id: 2, name: 'Jane' })
      cache.set('post:1', { id: 1, title: 'Hello' })
      
      const userEntries = cache.getByPattern(/^user:/)
      
      expect(userEntries.size).toBe(2)
      expect(userEntries.has('user:1')).toBe(true)
      expect(userEntries.has('user:2')).toBe(true)
      expect(userEntries.has('post:1')).toBe(false)
    })

    it('should handle expired entries in pattern matching', () => {
      cache.set('user:1', 'value1', 1000)
      cache.set('user:2', 'value2') // No TTL
      
      jest.advanceTimersByTime(1001)
      
      const userEntries = cache.getByPattern(/^user:/)
      
      expect(userEntries.size).toBe(1)
      expect(userEntries.has('user:2')).toBe(true)
    })
  })

  describe('Metadata', () => {
    it('should return entry metadata', () => {
      const startTime = Date.now()
      cache.set('key1', 'value1', 5000)
      
      // Access the entry to update access count
      cache.get('key1')
      cache.get('key1')
      
      const metadata = cache.getMetadata('key1')
      
      expect(metadata).toBeDefined()
      expect(metadata!.accessCount).toBe(2)
      expect(metadata!.ttl).toBe(5000)
      expect(metadata!.timestamp).toBeGreaterThanOrEqual(startTime)
      expect(metadata!.lastAccessed).toBeGreaterThanOrEqual(startTime)
    })

    it('should return undefined for non-existent key metadata', () => {
      expect(cache.getMetadata('nonexistent')).toBeUndefined()
    })

    it('should return undefined for expired key metadata', () => {
      cache.set('key1', 'value1', 1000)
      
      jest.advanceTimersByTime(1001)
      
      expect(cache.getMetadata('key1')).toBeUndefined()
    })
  })

  describe('Status and Health', () => {
    it('should return cache status', () => {
      cache.set('key1', 'value1')
      cache.get('key1')
      
      const status = cache.getStatus()
      
      expect(status.status).toBe('active')
      expect(status.stats).toBeDefined()
      expect(status.config.maxSize).toBe(3)
    })

    it('should estimate memory usage', () => {
      cache.set('key1', 'value1')
      cache.set('key2', { complex: 'object', with: ['array', 'data'] })
      
      const stats = cache.getStats()
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle setting same key multiple times', () => {
      cache.set('key1', 'value1')
      cache.set('key1', 'value2')
      cache.set('key1', 'value3')
      
      expect(cache.get('key1')).toBe('value3')
      expect(cache.size()).toBe(1)
    })

    it('should handle complex data types', () => {
      const complexData = {
        array: [1, 2, 3],
        nested: { deep: { value: 'test' } },
        date: new Date(),
        null_value: null,
        undefined_value: undefined
      }
      
      cache.set('complex', complexData)
      const retrieved = cache.get('complex')
      
      expect(retrieved).toEqual(complexData)
    })

    it('should handle zero max size gracefully', () => {
      const zeroCache = new MemoryCache(0)
      zeroCache.set('key1', 'value1')
      
      // Should immediately evict due to zero capacity
      expect(zeroCache.get('key1')).toBeUndefined()
    })

    it('should handle cleanup of expired entries', () => {
      cache.set('key1', 'value1', 1000)
      cache.set('key2', 'value2', 2000)
      cache.set('key3', 'value3') // No TTL
      
      // Fast forward past first expiration
      jest.advanceTimersByTime(1500)
      
      // Trigger cleanup (normally done by interval)
      cache['cleanupExpired']()
      
      expect(cache.get('key1')).toBeUndefined()
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
    })
  })
})
