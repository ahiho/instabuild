/**
 * Footer Component
 *
 * A comprehensive footer with multiple columns for links, social media, and copyright.
 * Perfect for landing pages that need navigation and legal links.
 *
 * AI Agent Instructions:
 * - Modify the `footerLinks` to add/remove link columns
 * - Update social media links in the `socialLinks` array
 * - Change the logo and company name
 * - Adjust copyright text
 * - Customize column layout (currently 4 columns on large screens)
 */

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Github, Twitter, Linkedin, Youtube } from 'lucide-react';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterProps {
  companyName: string;
  description?: string;
  columns: FooterColumn[];
  socialLinks?: {
    github?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
}

export function Footer({
  companyName,
  description,
  columns,
  socialLinks,
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-secondary/20">
      <div className="container mx-auto px-4 py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Company Info */}
          <div className="lg:col-span-1">
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

        <Separator className="my-8" />

        {/* Copyright */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} {companyName}. All rights reserved.
          </p>
          <div className="flex gap-6">
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
          </div>
        </div>
      </div>
    </footer>
  );
}
