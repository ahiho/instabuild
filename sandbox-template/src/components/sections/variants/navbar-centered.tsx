/**
 * NavbarCentered - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { NavbarCentered } from "@/components/sections/variants/navbar-centered"`
 * Or use centralized: `import { NavbarCentered } from "@/components/sections"`
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

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

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

// VARIANT 2: CENTERED NAVBAR
// ============================================================================

interface NavbarCenteredProps extends NavbarBaseProps {
  leftLinks?: NavLink[];
  rightLinks?: NavLink[];
}

/**
 * NavbarCentered Component
 *
 * VISUAL DESCRIPTION:
 * - Brand/logo centered in the navbar
 * - Navigation links split between left and right sides
 * - Symmetrical, balanced layout
 * - Clean, modern aesthetic
 *
 * USE WHEN:
 * - You want a distinctive, unique navigation layout
 * - Your brand/logo is the primary focus
 * - You have 2-4 navigation items (works best with fewer links)
 * - Creative or portfolio websites
 * - Luxury or premium brand sites
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Brand centered, links on both sides
 * - Styling: Same styling as original
 * - Props: Additional leftLinks and rightLinks props
 * - Responsive: Reverts to standard mobile menu
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Split your navigation links into left and right arrays
 * 2. Keep link count low (2-3 per side) for best visual balance
 * 3. If you don't provide leftLinks/rightLinks, it will use the links prop and split them
 * 4. CTA button appears on the right side
 *
 * @example
 * ```tsx
 * <NavbarCentered
 *   brandName="MyBrand"
 *   leftLinks={[
 *     { label: "About", href: "/about" },
 *     { label: "Services", href: "/services" },
 *   ]}
 *   rightLinks={[
 *     { label: "Work", href: "/work" },
 *     { label: "Contact", href: "/contact" },
 *   ]}
 *   ctaButton={{ text: "Get Started", href: "/signup" }}
 * />
 * ```
 */
export function NavbarCentered({
  brandName,
  links,
  leftLinks,
  rightLinks,
  ctaButton,
}: NavbarCenteredProps) {
  const [isOpen, setIsOpen] = useState(false);

  // If leftLinks/rightLinks not provided, split the links array
  const left = leftLinks || links.slice(0, Math.ceil(links.length / 2));
  const right = rightLinks || links.slice(Math.ceil(links.length / 2));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left Navigation - Desktop Only */}
        <div className="hidden md:flex md:items-center md:gap-6">
          {left.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Centered Logo/Brand */}
        <a
          href="/"
          className="flex items-center space-x-2 md:absolute md:left-1/2 md:-translate-x-1/2"
        >
          <span className="text-xl font-bold">{brandName}</span>
        </a>

        {/* Right Navigation - Desktop Only */}
        <div className="hidden md:flex md:items-center md:gap-6">
          {right.map((link, index) => (
            <a
              key={index}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
          {ctaButton && (
            <Button asChild size="sm">
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
              {[...left, ...right].map((link, index) => (
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
