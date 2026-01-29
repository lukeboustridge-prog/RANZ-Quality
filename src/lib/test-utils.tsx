import React from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Wrapper that provides any necessary context providers
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}

// Custom render function that wraps components with providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };
