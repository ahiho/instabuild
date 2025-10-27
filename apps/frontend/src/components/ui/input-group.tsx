import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { Button } from './button';

const InputGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex w-full flex-col rounded-lg border bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
      className
    )}
    {...props}
  />
));
InputGroup.displayName = 'InputGroup';

const inputGroupAddonVariants = cva('flex items-center gap-1 px-3 py-2', {
  variants: {
    align: {
      'inline-start': 'flex-row',
      'inline-end': 'flex-row-reverse',
      'block-start': 'flex-col',
      'block-end': 'flex-col-reverse',
    },
  },
  defaultVariants: {
    align: 'inline-start',
  },
});

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof inputGroupAddonVariants>
>(({ className, align, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(inputGroupAddonVariants({ align, className }))}
    {...props}
  />
));
InputGroupAddon.displayName = 'InputGroupAddon';

const InputGroupButton = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => (
  <Button ref={ref} className={cn('h-auto shrink-0', className)} {...props} />
));
InputGroupButton.displayName = 'InputGroupButton';

const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex w-full resize-none bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
InputGroupTextarea.displayName = 'InputGroupTextarea';

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea };
