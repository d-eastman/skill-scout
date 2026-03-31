import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkillCard from '../components/SkillCard.jsx';

const skill = {
  id: 'anthropics/claude-code/skills/pdf/SKILL.md',
  name: 'pdf',
  description: 'Generates professional PDF documents from markdown or structured data.',
  repo: 'anthropics/claude-code',
  repoOwner: 'anthropics',
  repoUrl: 'https://github.com/anthropics/claude-code',
  repoStars: 18420,
  skillPath: 'skills/pdf/SKILL.md',
  installCommand: 'npx skills add anthropics/claude-code --skill pdf',
  contentHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  lastCommitDate: '2026-03-20T09:15:00.000Z',
  scanDate: '2026-03-31T06:00:00.000Z',
  source: 'curated',
  duplicateCount: 1,
  duplicateIds: [],
};

describe('SkillCard', () => {
  it('renders the skill name', () => {
    render(<SkillCard skill={skill} />);
    expect(screen.getByText('pdf')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<SkillCard skill={skill} />);
    expect(screen.getByText(/Generates professional PDF/)).toBeInTheDocument();
  });

  it('renders the repo link', () => {
    render(<SkillCard skill={skill} />);
    const link = screen.getByRole('link', { name: /anthropics\/claude-code/ });
    expect(link).toHaveAttribute('href', 'https://github.com/anthropics/claude-code');
  });

  it('renders the install command', () => {
    render(<SkillCard skill={skill} />);
    expect(screen.getByText('npx skills add anthropics/claude-code --skill pdf')).toBeInTheDocument();
  });

  it('shows the star count', () => {
    render(<SkillCard skill={skill} />);
    expect(screen.getByText('18,420')).toBeInTheDocument();
  });

  it('shows source badge', () => {
    render(<SkillCard skill={skill} />);
    expect(screen.getByText('curated')).toBeInTheDocument();
  });

  it('shows content fingerprint', () => {
    render(<SkillCard skill={skill} />);
    expect(screen.getByText('#abcdef12')).toBeInTheDocument();
  });

  it('does not show duplicate badge when duplicateCount is 1', () => {
    render(<SkillCard skill={skill} />);
    expect(screen.queryByRole('button', { name: /copies/i })).toBeNull();
  });

  it('shows duplicate badge when duplicateCount > 1', () => {
    const dupSkill = {
      ...skill,
      duplicateCount: 2,
      duplicateIds: ['other-owner/other-repo/skills/pdf/SKILL.md'],
    };
    render(<SkillCard skill={dupSkill} />);
    expect(screen.getByRole('button', { name: /2 copies/i })).toBeInTheDocument();
  });

  it('expands duplicate list on badge click', async () => {
    const user = userEvent.setup();
    const dupSkill = {
      ...skill,
      duplicateCount: 2,
      duplicateIds: ['other-owner/other-repo/skills/pdf/SKILL.md'],
    };
    render(<SkillCard skill={dupSkill} />);
    const badge = screen.getByRole('button', { name: /2 copies/i });
    await user.click(badge);
    expect(screen.getByText(/other-owner\/other-repo/)).toBeInTheDocument();
  });

  it('copies install command to clipboard', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<SkillCard skill={skill} />);
    const copyBtn = screen.getByRole('button', { name: /copy install command/i });
    await user.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith(skill.installCommand);
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('shows "Show more" button for long descriptions', () => {
    const longSkill = {
      ...skill,
      description: 'A'.repeat(200),
    };
    render(<SkillCard skill={longSkill} />);
    expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument();
  });

  it('toggles description expansion', async () => {
    const user = userEvent.setup();
    const longSkill = { ...skill, description: 'A'.repeat(200) };
    render(<SkillCard skill={longSkill} />);
    const toggle = screen.getByRole('button', { name: /show more/i });
    await user.click(toggle);
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
  });
});
