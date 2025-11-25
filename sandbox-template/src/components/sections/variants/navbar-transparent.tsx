/**
 * NavbarTransparent - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { NavbarTransparent } from "@/components/sections/variants/navbar-transparent"`
 * Or use centralized: `import { NavbarTransparent } from "@/components/sections"`
 */

/**
 * Navbar Component Variants
 *
 * This file contains alternate styling and layout variants for the Navbar component.
 * All variants maintain the same core functionality but offer different visual presentations.
 *
 * VARIANTS INCLUDED:
 * 1. NavbarTransparent - Transparent initially, solid background on scroll
 * 2. NavbarCentered - Logo centered, navigation links split to sides
 * 3. NavbarMegaMenu - Dropdown mega menu with multi-column support
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { NavbarTransparent } from "@/components/sections/variants/navbar-variants"`
 * - Or use the centralized export: `import { NavbarTransparent } from "@/components/sections"`
 * - Each variant has the same basic props as the original Navbar component
 * - Check the specific variant's JSDoc for any additional props
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLink {
  label: string;
  href: string;
}

interface NavbarBaseProps {
  brandName: string;
  links: NavLink[];
  ctaButton?: {
    text: string;
    href: string;
  };
}

// VARIANT 1: TRANSPARENT NAVBAR
// ============================================================================

/**
 * NavbarTransparent Component
 *
 * VISUAL DESCRIPTION:
 * - Starts with transparent background
 * - Transitions to solid background with border on scroll
 * - Smooth fade animation
 * - Modern, clean aesthetic perfect for hero sections
 *
 * USE WHEN:
 * - You have a full-screen hero with background image/video
 * - You want the navbar to blend with the top section
 * - You need an elegant, premium feel
 * - Landing pages with strong visual headers
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Same horizontal layout
 * - Styling: Transparent by default, solid on scroll (>50px)
 * - Props: Same as original
 * - Animation: Smooth background/border transition
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Use this for landing pages with hero images/videos
 * 2. Ensure your hero section has sufficient padding-top (pt-16 or pt-20)
 * 3. Test with both light and dark backgrounds
 * 4. The transition happens at 50px scroll - adjust scrollThreshold if needed
 *
 * @example
 * ```tsx
 * <NavbarTransparent
 *   brandName="MyBrand"
 *   links={[
 *     { label: "Features", href: "#features" },
 *     { label: "Pricing", href: "#pricing" },
 *   ]}
 *   ctaButton={{ text: "Get Started", href: "/signup" }}
 * />
 * ```
 */
export function NavbarTransparent({
  brandName,
  links,
  ctaButton,
}: NavbarBaseProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollThreshold = 50;
      setIsScrolled(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'bg-background/95 backdrop-blur border-b supports-[backdrop-filter]:bg-background/60'
          : 'bg-transparent'
      )}
    >
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
                className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
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

// ============================================================================
