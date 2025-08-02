/**
 * Unit tests for utils.ts
 */

import { cn } from '../utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('base-class', 'additional-class');
    expect(result).toBe('base-class additional-class');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    
    const result = cn(
      'base-class',
      isActive && 'active',
      isDisabled && 'disabled'
    );
    
    expect(result).toBe('base-class active');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3');
    expect(result).toBe('class1 class2 class3');
  });

  it('should handle objects with boolean values', () => {
    const result = cn({
      'base-class': true,
      'active': true,
      'disabled': false,
      'hidden': false,
    });
    
    expect(result).toBe('base-class active');
  });

  it('should resolve Tailwind CSS conflicts', () => {
    // twMerge should resolve conflicting Tailwind classes
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4'); // px-4 should override px-2
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
    expect(cn(null)).toBe('');
    expect(cn(undefined)).toBe('');
  });

  it('should handle mixed input types', () => {
    const result = cn(
      'base',
      ['array-class'],
      { 'object-class': true, 'hidden': false },
      'string-class',
      null,
      undefined,
      false && 'conditional-false',
      true && 'conditional-true'
    );
    
    expect(result).toBe('base array-class object-class string-class conditional-true');
  });

  it('should handle complex Tailwind class conflicts', () => {
    const result = cn(
      'bg-red-500 text-white p-4',
      'bg-blue-500 p-2', // Should override bg-red-500 and p-4
      'hover:bg-green-500'
    );
    
    expect(result).toBe('text-white bg-blue-500 p-2 hover:bg-green-500');
  });

  it('should handle responsive and state variants', () => {
    const result = cn(
      'text-sm md:text-lg',
      'hover:text-blue-500 focus:text-red-500',
      'dark:text-white'
    );
    
    expect(result).toBe('text-sm md:text-lg hover:text-blue-500 focus:text-red-500 dark:text-white');
  });

  it('should maintain order for non-conflicting classes', () => {
    const result = cn(
      'flex items-center justify-center',
      'gap-2 rounded-lg',
      'shadow-md border'
    );
    
    expect(result).toBe('flex items-center justify-center gap-2 rounded-lg shadow-md border');
  });

  describe('edge cases', () => {
    it('should handle whitespace-only strings', () => {
      expect(cn('   ')).toBe('');
      expect(cn('\t\n')).toBe('');
    });

    it('should handle duplicate classes', () => {
      const result = cn('class1 class2', 'class1 class3');
      // Should contain all classes with duplicates resolved
      expect(result).toContain('class1');
      expect(result).toContain('class2');
      expect(result).toContain('class3');
    });

    it('should handle nested arrays', () => {
      const result = cn(['outer', ['inner1', 'inner2']], 'final');
      expect(result).toBe('outer inner1 inner2 final');
    });

    it('should handle deep object nesting', () => {
      const result = cn({
        base: true,
        nested: {
          deep: true,
          deeper: false
        }
      });
      
      // Note: clsx handles nested objects by stringifying them
      expect(result).toContain('base');
    });
  });

  describe('performance considerations', () => {
    it('should handle large number of classes efficiently', () => {
      const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      const result = cn(...manyClasses);
      
      expect(result).toContain('class-0');
      expect(result).toContain('class-99');
      expect(result.split(' ')).toHaveLength(100);
    });

    it('should handle repeated calls efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        cn('base-class', i % 2 === 0 && 'even', i % 2 === 1 && 'odd');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 calls in reasonable time (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});