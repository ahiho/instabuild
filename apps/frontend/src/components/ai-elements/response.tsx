'use client';

import { cn } from '../../lib/utils';
import { type ComponentProps, memo } from 'react';
import { Streamdown } from 'streamdown';

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      shikiTheme={['github-dark', 'github-dark']}
      className={cn(
        'max-w-full break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:break-words [&_pre]:overflow-x-auto',
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = 'Response';
