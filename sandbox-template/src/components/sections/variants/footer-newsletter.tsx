/**
 * FooterNewsletter - Section Component Variant
 *
 * This is an individual variant file for better tree-shaking and smaller bundle sizes.
 * Import directly: `import { FooterNewsletter } from "@/components/sections/variants/footer-newsletter"`
 * Or use centralized: `import { FooterNewsletter } from "@/components/sections"`
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
import { Input } from '@/components/ui/input';
import { Github, Twitter, Linkedin, Youtube } from 'lucide-react';

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

// VARIANT 2: NEWSLETTER FOOTER
// ============================================================================

interface FooterNewsletterProps {
  companyName: string;
  description?: string;
  newsletterTitle?: string;
  newsletterDescription?: string;
  columns: FooterColumn[];
  socialLinks?: SocialLinks;
}

/**
 * FooterNewsletter Component
 *
 * VISUAL DESCRIPTION:
 * - Newsletter signup prominently featured at top
 * - Multi-column layout for links below
 * - Email input with submit button
 * - Encourages email collection
 * - Marketing-focused design
 *
 * USE WHEN:
 * - Building email list is priority
 * - Content marketing strategy
 * - Blog or publication sites
 * - E-commerce sites
 * - You want to capture leads
 * - Regular email communications planned
 *
 * DIFFERENCES FROM ORIGINAL:
 * - Layout: Newsletter section on top
 * - Focus: Email capture priority
 * - Features: Input form for signup
 * - Use case: Lead generation
 *
 * AI AGENT INSTRUCTIONS:
 * 1. Newsletter form is prominent
 * 2. Connect form action to your email service
 * 3. Consider adding privacy note
 * 4. Great for content-driven sites
 * 5. Combine with email marketing platform
 *
 * @example
 * ```tsx
 * <FooterNewsletter
 *   companyName="MyBlog"
 *   description="Your daily source for tech news"
 *   newsletterTitle="Subscribe to our newsletter"
 *   newsletterDescription="Get the latest updates delivered to your inbox"
 *   columns={[
 *     {
 *       title: "Content",
 *       links: [
 *         { label: "Blog", href: "/blog" },
 *         { label: "Resources", href: "/resources" },
 *       ],
 *     },
 *   ]}
 *   socialLinks={{ twitter: "https://twitter.com/myblog" }}
 * />
 * ```
 */
export function FooterNewsletter({
  companyName,
  description,
  newsletterTitle = 'Stay Updated',
  newsletterDescription = 'Subscribe to our newsletter for the latest updates',
  columns,
  socialLinks,
}: FooterNewsletterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-secondary/20">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        {/* Newsletter Section */}
        <div className="mb-12 pb-12 border-b">
          <div className="max-w-xl">
            <h3 className="text-2xl font-bold mb-2">{newsletterTitle}</h3>
            <p className="text-muted-foreground mb-6">
              {newsletterDescription}
            </p>
            <form className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter your email"
                className="flex-1"
                required
              />
              <Button type="submit" size="lg">
                Subscribe
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-3">{companyName}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mb-4">
                {description}
              </p>
            )}
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

          {/* Link Columns */}
          {columns.map((column, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{column.title}</h4>
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

        {/* Copyright */}
        <div className="pt-8 border-t">
          <p className="text-sm text-muted-foreground text-center">
            © {currentYear} {companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ============================================================================
