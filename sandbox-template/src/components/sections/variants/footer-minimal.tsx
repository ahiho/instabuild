/**
 * FooterMinimal - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FooterMinimal } from "@/components/sections/variants/footer-minimal"`
 * Or use centralized: `import { FooterMinimal } from "@/components/sections"`
 */

/**
 * Footer Component Variants
 *
 * This file contains alternate styling and layout variants for the Footer component.
 * Different ways to structure footer navigation and information.
 *
 * VARIANTS INCLUDED:
 * 1. FooterMinimal - Single row with centered links
 * 2. FooterNewsletter - Email signup form prominently featured
 * 3. FooterMega - Large footer with additional company info
 *
 * AI AGENT INSTRUCTIONS:
 * - Import the variant you need: `import { FooterMinimal } from "@/components/sections/variants/footer-variants"`
 * - Or use the centralized export: `import { FooterMinimal } from "@/components/sections"`
 * - Choose based on amount of information and desired complexity
 * - Footer is last impression - make it count
 */

import { Button } from '@/components/ui/button';
import { Github, Twitter, Linkedin, Youtube } from 'lucide-react';

interface FooterLink {
  label: string;
  href: string;
}

interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
}

// VARIANT 1: MINIMAL FOOTER
// ============================================================================

interface FooterMinimalProps {
  companyName: string;
  links: FooterLink[];
  socialLinks?: SocialLinks;
}

/**
 * FooterMinimal Component
 *
 * VISUAL DESCRIPTION:
 * - Single row layout
 * - Centered links
 * - Compact design
 * - Clean, simple aesthetic
 * - Minimal information
 *
 * USE WHEN:
 * - You have limited footer content (3-6 links)
 * - Building simple landing pages
 * - Minimalist design philosophy
 * - Space is limited
 * - Single-page websites
 * - Portfolio or personal sites
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Single row instead of multi-column
 * - Content: Much less information
 * - Visual: Very compact
 * - Use case: Simple pages
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best with 3-6 total links
 * 2. Social icons optional
 * 3. Very clean, unobtrusive
 * 4. Great for single-page sites
 * 5. Works well when footer is not primary navigation
 *
 * @example
 * ```tsx
 * <FooterMinimal
 *   companyName="MyCompany"
 *   links={[
 *     { label: "About", href: "/about" },
 *     { label: "Privacy", href: "/privacy" },
 *     { label: "Terms", href: "/terms" },
 *   ]}
 *   socialLinks={{
 *     twitter: "https://twitter.com/mycompany",
 *     github: "https://github.com/mycompany",
 *   }}
 * />
 * ```
 */
export function FooterMinimal({
  companyName,
  links,
  socialLinks,
}: FooterMinimalProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6">
          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {links.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Social Links */}
          {socialLinks && (
            <div className="flex gap-2">
              {socialLinks.github && (
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                  >
                    <Github className="size-5" />
                  </a>
                </Button>
              )}
              {socialLinks.twitter && (
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                  >
                    <Twitter className="size-5" />
                  </a>
                </Button>
              )}
              {socialLinks.linkedin && (
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="size-5" />
                  </a>
                </Button>
              )}
              {socialLinks.youtube && (
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                  >
                    <Youtube className="size-5" />
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Copyright */}
          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} {companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
