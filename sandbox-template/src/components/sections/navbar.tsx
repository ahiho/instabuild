/**
 * Navbar Component
 *
 * A responsive navigation bar with mobile menu support.
 * Includes logo, navigation links, and CTA button.
 *
 * AI Agent Instructions:
 * - Modify navigation links in the component
 * - Change logo/brand name
 * - Adjust CTA button text and link
 * - Customize mobile menu behavior
 * - Add theme toggle or other features as needed
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  brandName: string;
  links: NavLink[];
  ctaButton?: {
    text: string;
    href: string;
  };
}

export function Navbar({ brandName, links, ctaButton }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <a href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">{brandName}</span>
        </a>

        {/* Desktop Navigation */}
        <div className="hidden md:flex md:items-center md:gap-8">
          <div className="flex gap-6">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
          {ctaButton && (
            <Button asChild>
              <a href={ctaButton.href}>{ctaButton.text}</a>
            </Button>
          )}
        </div>

        {/* Mobile Navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col gap-4 mt-8 px-2">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
              {ctaButton && (
                <Button asChild className="mt-4">
                  <a href={ctaButton.href} onClick={() => setIsOpen(false)}>
                    {ctaButton.text}
                  </a>
                </Button>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
