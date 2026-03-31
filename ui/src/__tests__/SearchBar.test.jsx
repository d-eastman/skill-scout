import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchBar from '../components/SearchBar.jsx';

describe('SearchBar', () => {
  it('renders a search input', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  describe('debounce behavior', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('calls onChange after debounce delay', () => {
      const onChange = vi.fn();
      render(<SearchBar value="" onChange={onChange} />);
      const input = screen.getByRole('searchbox');

      act(() => { fireEvent.change(input, { target: { value: 'pdf' } }); });
      expect(onChange).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(300); });
      expect(onChange).toHaveBeenCalledWith('pdf');
    });

    it('does not call onChange before debounce delay', () => {
      const onChange = vi.fn();
      render(<SearchBar value="" onChange={onChange} />);
      const input = screen.getByRole('searchbox');

      act(() => { fireEvent.change(input, { target: { value: 'x' } }); });
      act(() => { vi.advanceTimersByTime(100); });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('shows clear button when value is non-empty', () => {
    render(<SearchBar value="pdf" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', () => {
    render(<SearchBar value="" onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /clear search/i })).toBeNull();
  });

  it('calls onChange with empty string when clear is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchBar value="pdf" onChange={onChange} />);
    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    await user.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
