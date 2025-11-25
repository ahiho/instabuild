/**
 * NavbarMegaMenu - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { NavbarMegaMenu } from "@/components/sections/variants/navbar-megamenu"`
 * Or use centralized: `import { NavbarMegaMenu } from "@/components/sections"`
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
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import { Menu } from 'lucide-react';

interface NavLink {
  label: string;
  href: string;
}

// VARIANT 3: MEGA MENU NAVBAR
// ============================================================================

interface MegaMenuColumn {
  title: string;
  links: NavLink[];
}

interface MegaMenuItem {
  label: string;
  columns: MegaMenuColumn[];
}

interface NavbarMegaMenuProps {
  brandName: string;
  menuItems: MegaMenuItem[];
  simpleLinks?: NavLink[];
  ctaButton?: {
    text: string;
    href: string;
  };
}

/**
 * NavbarMegaMenu Component
 *
 * VISUAL DESCRIPTION:
 * - Dropdown mega menus with multi-column layouts
 * - Hover to reveal organized navigation sections
 * - Professional, enterprise-grade appearance
 * - Combines dropdown menus with simple links
 *
 * USE WHEN:
 * - You have many navigation items organized into categories
 * - E-commerce sites with product categories
 * - Corporate sites with complex information architecture
 * - SaaS products with multiple feature sections
 * - Sites with 10+ pages to navigate
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Dropdown mega menus with columns
 * - Styling: Uses shadcn NavigationMenu component
 * - Props: Different structure - uses menuItems array with columns
 * - Features: Multi-level navigation support
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Structure your navigation as menuItems with columns
 * 2. Each menu item can have multiple columns
 * 3. Each column should have a title and 3-5 links
 * 4. Use simpleLinks for pages that don't need dropdowns
 * 5. Great for content-heavy sites
 *
 * @example
 * ```tsx
 * <NavbarMegaMenu
 *   brandName="MyStore"
 *   menuItems={[
 *     {
 *       label: "Products",
 *       columns: [
 *         {
 *           title: "Categories",
 *           links: [
 *             { label: "Electronics", href: "/electronics" },
 *             { label: "Clothing", href: "/clothing" },
 *           ],
 *         },
 *         {
 *           title: "Featured",
 *           links: [
 *             { label: "New Arrivals", href: "/new" },
 *             { label: "Best Sellers", href: "/bestsellers" },
 *           ],
 *         },
 *       ],
 *     },
 *   ]}
 *   simpleLinks={[
 *     { label: "About", href: "/about" },
 *     { label: "Contact", href: "/contact" },
 *   ]}
 *   ctaButton={{ text: "Shop Now", href: "/shop" }}
 * />
 * ```
 */
export function NavbarMegaMenu({
  brandName,
  menuItems,
  simpleLinks = [],
  ctaButton,
}: NavbarMegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <a href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold">{brandName}</span>
        </a>

        {/* Desktop Navigation with Mega Menu */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <NavigationMenu>
            <NavigationMenuList>
              {/* Mega Menu Items */}
              {menuItems.map((item, index) => (
                <NavigationMenuItem key={index}>
                  <NavigationMenuTrigger className="text-sm font-medium">
                    {item.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="grid gap-6 p-6 w-[600px] grid-cols-2">
                      {item.columns.map((column, colIndex) => (
                        <div key={colIndex} className="space-y-3">
                          <h4 className="text-sm font-semibold">
                            {column.title}
                          </h4>
                          <ul className="space-y-2">
                            {column.links.map((link, linkIndex) => (
                              <li key={linkIndex}>
                                <NavigationMenuLink asChild>
                                  <a
                                    href={link.href}
                                    className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    {link.label}
                                  </a>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ))}

              {/* Simple Links */}
              {simpleLinks.map((link, index) => (
                <NavigationMenuItem key={`simple-${index}`}>
                  <NavigationMenuLink asChild>
                    <a
                      href={link.href}
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary px-4 py-2"
                    >
                      {link.label}
                    </a>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

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
              {/* Mega menu items - flatten for mobile */}
              {menuItems.map((item, itemIndex) => (
                <div key={itemIndex} className="space-y-2">
                  <div className="font-semibold text-foreground">
                    {item.label}
                  </div>
                  {item.columns.map((column, colIndex) =>
                    column.links.map((link, linkIndex) => (
                      <a
                        key={`${colIndex}-${linkIndex}`}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="block text-sm pl-4 text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </a>
                    ))
                  )}
                </div>
              ))}

              {/* Simple links */}
              {simpleLinks.map((link, index) => (
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
