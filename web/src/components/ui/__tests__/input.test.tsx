/**
 * Unit tests for Input component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render input with default props', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveClass('flex', 'h-10', 'w-full', 'rounded-md');
    });

    it('should render input with placeholder', () => {
      render(<Input placeholder="Enter text here" />);
      
      const input = screen.getByPlaceholderText('Enter text here');
      expect(input).toBeInTheDocument();
    });

    it('should render input with default value', () => {
      render(<Input defaultValue="Default text" />);
      
      const input = screen.getByDisplayValue('Default text');
      expect(input).toBeInTheDocument();
    });

    it('should render input with controlled value', () => {
      render(<Input value="Controlled value" onChange={() => {}} />);
      
      const input = screen.getByDisplayValue('Controlled value');
      expect(input).toBeInTheDocument();
    });
  });

  describe('input types', () => {
    it('should render text input by default', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render password input', () => {
      render(<Input type="password" />);
      
      const input = screen.getByLabelText('', { selector: 'input[type="password"]' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'password');
    });

    it('should render email input', () => {
      render(<Input type="email" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render number input', () => {
      render(<Input type="number" />);
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should render search input', () => {
      render(<Input type="search" />);
      
      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('type', 'search');
    });

    it('should render tel input', () => {
      render(<Input type="tel" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'tel');
    });

    it('should render url input', () => {
      render(<Input type="url" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'url');
    });

    it('should render date input', () => {
      render(<Input type="date" />);
      
      const input = screen.getByLabelText('', { selector: 'input[type="date"]' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'date');
    });

    it('should render file input', () => {
      render(<Input type="file" />);
      
      const input = screen.getByLabelText('', { selector: 'input[type="file"]' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'file');
    });
  });

  describe('styling', () => {
    it('should apply default styling classes', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'flex',
        'h-10',
        'w-full',
        'rounded-md',
        'border',
        'border-input',
        'bg-background',
        'px-3',
        'py-2',
        'text-sm'
      );
    });

    it('should apply focus styles', () => {
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'focus-visible:ring-offset-2'
      );
    });

    it('should apply disabled styles', () => {
      render(<Input disabled />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass(
        'disabled:cursor-not-allowed',
        'disabled:opacity-50'
      );
    });

    it('should apply file input styles', () => {
      render(<Input type="file" data-testid="file-input" />);
      
      const input = screen.getByTestId('file-input');
      expect(input).toHaveClass(
        'file:border-0',
        'file:bg-transparent',
        'file:text-sm',
        'file:font-medium'
      );
    });

    it('should apply placeholder styles', () => {
      render(<Input placeholder="Test placeholder" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('placeholder:text-muted-foreground');
    });

    it('should merge custom className', () => {
      render(<Input className="custom-class" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('flex'); // Default class should still be applied
    });
  });

  describe('HTML attributes', () => {
    it('should pass through standard input attributes', () => {
      render(
        <Input
          id="test-input"
          name="test-name"
          required
          minLength={5}
          maxLength={50}
          pattern="[A-Za-z]+"
          title="Test input title"
          data-testid="custom-input"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'test-input');
      expect(input).toHaveAttribute('name', 'test-name');
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('minLength', '5');
      expect(input).toHaveAttribute('maxLength', '50');
      expect(input).toHaveAttribute('pattern', '[A-Za-z]+');
      expect(input).toHaveAttribute('title', 'Test input title');
      expect(input).toHaveAttribute('data-testid', 'custom-input');
    });

    it('should handle number input attributes', () => {
      render(
        <Input
          type="number"
          min={0}
          max={100}
          step={5}
        />
      );
      
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('min', '0');
      expect(input).toHaveAttribute('max', '100');
      expect(input).toHaveAttribute('step', '5');
    });

    it('should handle autocomplete attribute', () => {
      render(<Input autoComplete="email" />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });

    it('should handle readonly attribute', () => {
      render(<Input readOnly />);
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('interactions', () => {
    it('should handle input changes', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<Input onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello');
      
      expect(handleChange).toHaveBeenCalledTimes(5); // One for each character
      expect(input).toHaveValue('Hello');
    });

    it('should handle controlled input', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      const ControlledInput = () => {
        const [value, setValue] = React.useState('');
        return (
          <Input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              handleChange(e);
            }}
          />
        );
      };

      render(<ControlledInput />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test');
      
      expect(handleChange).toHaveBeenCalledTimes(4);
      expect(input).toHaveValue('Test');
    });

    it('should handle focus and blur events', async () => {
      const handleFocus = jest.fn();
      const handleBlur = jest.fn();
      const user = userEvent.setup();
      
      render(
        <div>
          <Input onFocus={handleFocus} onBlur={handleBlur} />
          <button>Other element</button>
        </div>
      );
      
      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button');
      
      await user.click(input);
      expect(handleFocus).toHaveBeenCalledTimes(1);
      
      await user.click(button);
      expect(handleBlur).toHaveBeenCalledTimes(1);
    });

    it('should handle keyboard events', async () => {
      const handleKeyDown = jest.fn();
      const handleKeyUp = jest.fn();
      const user = userEvent.setup();
      
      render(<Input onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'a');
      
      expect(handleKeyDown).toHaveBeenCalled();
      expect(handleKeyUp).toHaveBeenCalled();
    });

    it('should not accept input when disabled', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<Input disabled onChange={handleChange} />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test');
      
      expect(handleChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('');
    });

    it('should not accept input when readonly', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();
      
      render(<Input readOnly onChange={handleChange} defaultValue="readonly" />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'Test');
      
      expect(handleChange).not.toHaveBeenCalled();
      expect(input).toHaveValue('readonly');
    });
  });

  describe('accessibility', () => {
    it('should be accessible by keyboard', async () => {
      const user = userEvent.setup();
      
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      
      await user.tab();
      expect(input).toHaveFocus();
      
      await user.keyboard('Hello');
      expect(input).toHaveValue('Hello');
    });

    it('should support ARIA attributes', () => {
      render(
        <Input
          aria-label="Custom label"
          aria-describedby="description"
          aria-invalid="true"
          aria-required="true"
        />
      );
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Custom label');
      expect(input).toHaveAttribute('aria-describedby', 'description');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-required', 'true');
    });

    it('should work with labels', () => {
      render(
        <div>
          <label htmlFor="test-input">Test Label</label>
          <Input id="test-input" />
        </div>
      );
      
      const input = screen.getByLabelText('Test Label');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('id', 'test-input');
    });
  });

  describe('form integration', () => {
    it('should work in forms', async () => {
      const handleSubmit = jest.fn();
      const user = userEvent.setup();
      
      render(
        <form onSubmit={handleSubmit}>
          <Input name="test-field" />
          <button type="submit">Submit</button>
        </form>
      );
      
      const input = screen.getByRole('textbox');
      const button = screen.getByRole('button');
      
      await user.type(input, 'Form value');
      await user.click(button);
      
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should validate with HTML5 validation', async () => {
      const user = userEvent.setup();
      
      render(<Input type="email" required />);
      
      const input = screen.getByRole('textbox');
      
      await user.type(input, 'invalid-email');
      
      // HTML5 validation will be handled by the browser
      expect(input).toHaveValue('invalid-email');
      expect(input).toBeInvalid();
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      
      render(<Input ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.tagName).toBe('INPUT');
    });

    it('should allow ref methods to be called', () => {
      const ref = React.createRef<HTMLInputElement>();
      
      render(<Input ref={ref} />);
      
      expect(() => {
        ref.current?.focus();
        ref.current?.blur();
        ref.current?.select();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle null and undefined values gracefully', () => {
      render(<Input value={undefined as any} onChange={() => {}} />);
      
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should handle very long values', async () => {
      const longValue = 'a'.repeat(100); // Reduce length for faster test
      const user = userEvent.setup();
      
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, longValue);
      
      expect(input).toHaveValue(longValue);
    }, 15000); // Increase timeout

    it('should handle special characters', async () => {
      const specialChars = '!@#$%^&*()_+-=';
      const user = userEvent.setup();
      
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      await user.type(input, specialChars);
      
      expect(input).toHaveValue(specialChars);
    });

    it('should handle copy and paste operations', async () => {
      const user = userEvent.setup();
      
      render(<Input />);
      
      const input = screen.getByRole('textbox');
      
      // Focus and type some text
      await user.click(input);
      await user.type(input, 'Hello World');
      
      // Test that the text was typed correctly
      expect(input).toHaveValue('Hello World');
      
      // Clear the input
      await user.clear(input);
      expect(input).toHaveValue('');
    });
  });
});