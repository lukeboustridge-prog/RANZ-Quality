import { render } from '@/lib/test-utils';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '../button';

expect.extend(toHaveNoViolations);

describe('Button accessibility', () => {
  it('should have no WCAG violations - default button', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations - disabled button', async () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations - destructive variant', async () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations - outline variant', async () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations - ghost variant', async () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no violations - icon button with label', async () => {
    const { container } = render(
      <Button variant="ghost" size="icon" aria-label="Open menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
      </Button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Button focus visibility', () => {
  it('should have focus-visible ring class', () => {
    const { container } = render(<Button>Test</Button>);
    const button = container.querySelector('button');
    expect(button?.className).toContain('focus-visible:ring');
  });
});
