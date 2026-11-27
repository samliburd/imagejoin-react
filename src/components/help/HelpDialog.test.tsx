import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HelpDialog from './HelpDialog';

describe('HelpDialog', () => {
  it('opens via showModal when isOpen=true and invokes onClose when dismissed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { container, rerender } = render(<HelpDialog isOpen={false} onClose={onClose} />);
    const dialog = container.querySelector('#helpDialog') as HTMLDialogElement;
    expect(dialog).not.toHaveAttribute('open');
    expect(dialog).toHaveAttribute('closedby', 'any');

    rerender(<HelpDialog isOpen={true} onClose={onClose} />);
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('heading', { name: 'ImageJoin Guide & Shortcuts' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
