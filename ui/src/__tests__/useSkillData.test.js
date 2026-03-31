import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSkillData } from '../hooks/useSkillData.js';

const mockData = {
  meta: { scanDate: '2026-03-31T00:00:00Z', totalSkills: 2, uniqueSkills: 2, totalRepos: 1, duplicateGroups: 0 },
  skills: [
    { id: '1', name: 'pdf' },
    { id: '2', name: 'docx' },
  ],
};

describe('useSkillData', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in loading state', () => {
    global.fetch.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useSkillData());
    expect(result.current.loading).toBe(true);
    expect(result.current.skills).toEqual([]);
    expect(result.current.meta).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('resolves with skills and meta on success', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const { result } = renderHook(() => useSkillData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.skills).toHaveLength(2);
    expect(result.current.meta.totalSkills).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('sets error on non-ok response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404 });

    const { result } = renderHook(() => useSkillData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toMatch(/404/);
    expect(result.current.skills).toEqual([]);
  });

  it('sets error on network failure', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSkillData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
  });
});
