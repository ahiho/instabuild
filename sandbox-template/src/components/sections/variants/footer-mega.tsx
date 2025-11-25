/**
 * FooterMega - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FooterMega } from "@/components/sections/variants/footer-mega"`
 * Or use centralized: `import { FooterMega } from "@/components/sections"`
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
import { Separator } from '@/components/ui/separator';
import { Github, Twitter, Linkedin, Youtube, Mail } from 'lucide-react';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
}

// VARIANT 3: MEGA FOOTER
// ============================================================================

interface FooterMegaProps {
  companyName: string;
  description?: string;
  tagline?: string;
  columns: FooterColumn[];
  socialLinks?: SocialLinks;
  contactEmail?: string;
  address?: string;
}

/**
 * FooterMega Component
 *
 * VISUAL DESCRIPTION:
 * - Large, comprehensive footer
 * - Additional company information
 * - Contact details
 * - Multiple link columns
 * - Professional, corporate style
 * - Maximum information density
 *
 * USE WHEN:
 * - You have lots of footer content
 * - Building corporate/enterprise sites
 * - Multiple product lines or services
 * - Need comprehensive site map in footer
 * - Contact information is important
 * - Professional, established companies
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Larger, more sections
 * - Content: Much more information
 * - Features: Contact details, address
 * - Visual: Professional, comprehensive
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Best for larger sites with many pages
 * 2. Include all important navigation
 * 3. Contact info adds credibility
 * 4. Works great for B2B sites
 * 5. Can serve as site map
 *
 * @example
 * ```tsx
 * <FooterMega
 *   companyName="Enterprise Corp"
 *   description="Leading provider of business solutions"
 *   tagline="Empowering businesses since 2010"
 *   contactEmail="info@enterprise.com"
 *   address="123 Business St, City, State 12345"
 *   columns={[
 *     {
 *       title: "Products",
 *       links: [
 *         { label: "Product A", href: "/product-a" },
 *         { label: "Product B", href: "/product-b" },
 *       ],
 *     },
 *     // More columns...
 *   ]}
 *   socialLinks={{
 *     linkedin: "https://linkedin.com/company/enterprise",
 *     twitter: "https://twitter.com/enterprise",
 *   }}
 * />
 * ```
 */
export function FooterMega({
  companyName,
  description,
  tagline,
  columns,
  socialLinks,
  contactEmail,
  address,
}: FooterMegaProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-16 sm:py-20">
        {/* Main Footer Content */}
        <div className="grid gap-12 lg:grid-cols-5 mb-12">
          {/* Company Info - Takes 2 columns */}
          <div className="lg:col-span-2">
            <h3 className="text-2xl font-bold mb-3">{companyName}</h3>
            {tagline && (
              <p className="text-sm font-medium text-primary mb-3">{tagline}</p>
            )}
            {description && (
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                {description}
              </p>
            )}

            {/* Contact Info */}
            {(contactEmail || address) && (
              <div className="space-y-3 mb-6">
                {contactEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground" />
                    <a
                      href={`mailto:${contactEmail}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {contactEmail}
                    </a>
                  </div>
                )}
                {address && (
                  <p className="text-sm text-muted-foreground">{address}</p>
                )}
              </div>
            )}

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
          </div>

          {/* Link Columns - Takes 3 columns */}
          {columns.map((column, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">
                {column.title}
              </h4>
              <ul className="space-y-3">
                {column.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {companyName}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-6">
            <a
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="/cookies"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Cookie Policy
            </a>
            <a
              href="/accessibility"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Accessibility
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
