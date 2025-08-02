/**
 * Unit tests for LoadingSpinner component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../loading-spinner';

describe('LoadingSpinner', () => {
  describe('rendering', () => {
    it('should render spinner with default props', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should render spinner with default medium size', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('should apply base spinner styles', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass(
        'animate-spin',
        'rounded-full',
        'border-2',
        'border-current',
        'border-t-transparent'
      );
    });
  });

  describe('size variants', () => {
    it('should render small spinner', () => {
      render(<LoadingSpinner size="sm" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-4', 'w-4');
    });

    it('should render medium spinner', () => {
      render(<LoadingSpinner size="md" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-6', 'w-6');
    });

    it('should render large spinner', () => {
      render(<LoadingSpinner size="lg" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-8', 'w-8');
    });
  });

  describe('custom styling', () => {
    it('should merge custom className', () => {
      render(<LoadingSpinner className="custom-class" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('custom-class');
      expect(spinner).toHaveClass('animate-spin'); // Base class should still be applied
    });

    it('should override size classes with custom className', () => {
      render(<LoadingSpinner size="sm" className="h-10 w-10" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-10', 'w-10');
      // Should override the small size classes (h-4 w-4)
    });

    it('should apply custom colors', () => {
      render(<LoadingSpinner className="text-blue-500" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('text-blue-500');
      expect(spinner).toHaveClass('border-current'); // Should inherit the blue color
    });

    it('should support custom border styles', () => {
      render(<LoadingSpinner className="border-4 border-red-500 border-t-transparent" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('border-4', 'border-red-500', 'border-t-transparent');
    });
  });

  describe('accessibility', () => {
    it('should have correct ARIA role', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have correct ARIA label', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading');
    });

    it('should be announced by screen readers', () => {
      render(<LoadingSpinner />);
      
      // The role="status" and aria-label make it accessible to screen readers
      const spinner = screen.getByLabelText('Loading');
      expect(spinner).toBeInTheDocument();
    });

    it('should be distinguishable from decorative elements', () => {
      render(
        <div>
          <div className="animate-spin">Decorative spinner</div>
          <LoadingSpinner />
        </div>
      );
      
      // Only the LoadingSpinner should have role="status"
      const statusElements = screen.getAllByRole('status');
      expect(statusElements).toHaveLength(1);
    });
  });

  describe('animation', () => {
    it('should have spin animation class', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should maintain animation with custom classes', () => {
      render(<LoadingSpinner className="text-red-500 border-4" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
      expect(spinner).toHaveClass('text-red-500', 'border-4');
    });
  });

  describe('integration scenarios', () => {
    it('should work inside buttons', () => {
      render(
        <button disabled>
          <LoadingSpinner size="sm" />
          Loading...
        </button>
      );
      
      const button = screen.getByRole('button');
      const spinner = screen.getByRole('status');
      
      expect(button).toContain(spinner);
      expect(button).toHaveTextContent('Loading...');
      expect(button).toBeDisabled();
    });

    it('should work inside forms', () => {
      render(
        <form>
          <div>
            <LoadingSpinner />
            <span>Submitting form...</span>
          </div>
        </form>
      );
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(screen.getByText('Submitting form...')).toBeInTheDocument();
    });

    it('should work with different color themes', () => {
      render(
        <div className="dark">
          <LoadingSpinner className="text-white" />
        </div>
      );
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('text-white');
    });

    it('should work in loading overlays', () => {
      render(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <LoadingSpinner size="lg" className="text-white" />
        </div>
      );
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-8', 'w-8', 'text-white');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined size gracefully', () => {
      render(<LoadingSpinner size={undefined as any} />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('h-6', 'w-6'); // Should default to medium
    });

    it('should handle invalid size gracefully', () => {
      render(<LoadingSpinner size={'xl' as any} />);
      
      const spinner = screen.getByRole('status');
      // Should not crash, though the size class might not be applied
      expect(spinner).toBeInTheDocument();
    });

    it('should handle empty className', () => {
      render(<LoadingSpinner className="" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should handle null className', () => {
      render(<LoadingSpinner className={null as any} />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('performance', () => {
    it('should render quickly with default props', () => {
      const startTime = performance.now();
      
      render(<LoadingSpinner />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(10); // Should render in less than 10ms
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should handle multiple spinners efficiently', () => {
      const startTime = performance.now();
      
      render(
        <div>
          {Array.from({ length: 10 }, (_, i) => (
            <LoadingSpinner key={i} size={i % 2 === 0 ? 'sm' : 'lg'} />
          ))}
        </div>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      expect(renderTime).toBeLessThan(50); // Should render 10 spinners in less than 50ms
      expect(screen.getAllByRole('status')).toHaveLength(10);
    });
  });

  describe('CSS class combinations', () => {
    it('should handle conflicting size classes', () => {
      render(<LoadingSpinner size="sm" className="h-12 w-12" />);
      
      const spinner = screen.getByRole('status');
      // The utility function should resolve conflicts, preferring the custom classes
      expect(spinner).toHaveClass('h-12', 'w-12');
    });

    it('should handle multiple border styles', () => {
      render(
        <LoadingSpinner className="border-4 border-dashed border-blue-500 border-t-red-500" />
      );
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass(
        'border-4',
        'border-dashed',
        'border-blue-500',
        'border-t-red-500'
      );
    });

    it('should maintain rounded-full with custom border-radius', () => {
      render(<LoadingSpinner className="rounded-lg" />);
      
      const spinner = screen.getByRole('status');
      // Should prefer the custom rounded-lg over rounded-full
      expect(spinner).toHaveClass('rounded-lg');
    });
  });

  describe('component composition', () => {
    it('should work as a child component', () => {
      const LoadingButton = ({ children, loading }: { children: React.ReactNode; loading: boolean }) => (
        <button disabled={loading}>
          {loading && <LoadingSpinner size="sm" />}
          {children}
        </button>
      );

      render(<LoadingButton loading={true}>Save</LoadingButton>);
      
      const button = screen.getByRole('button');
      const spinner = screen.getByRole('status');
      
      expect(button).toContain(spinner);
      expect(button).toHaveTextContent('Save');
      expect(button).toBeDisabled();
    });

    it('should work with conditional rendering', () => {
      const ConditionalSpinner = ({ show }: { show: boolean }) => (
        <div>
          {show && <LoadingSpinner />}
          <span>Content</span>
        </div>
      );

      const { rerender } = render(<ConditionalSpinner show={false} />);
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();

      rerender(<ConditionalSpinner show={true} />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});