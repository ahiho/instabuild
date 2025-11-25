/**
 * Variants Showcase Page (Internal Reference)
 *
 * This page showcases all available section component variants.
 * It's designed as an internal reference for AI coding agents.
 *
 * ACCESS: This page is not linked in the main navigation.
 * Direct URL: /variants-showcase
 *
 * PURPOSE:
 * - Visual reference for all 27+ variants
 * - Code examples for each variant
 * - Quick comparison of styling differences
 * - AI agent reference guide
 *
 * AI AGENT INSTRUCTIONS:
 * - Use this page to see all available variants
 * - Copy code examples directly into your implementations
 * - Reference variant names and props structures
 * - Understand visual differences between variants
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function VariantsShowcase() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Component Variants Showcase
              </h1>
              <p className="text-muted-foreground">
                Internal reference for AI agents - 27+ section component
                variants
              </p>
            </div>
            <Badge variant="secondary" className="text-base px-4 py-2">
              Internal Only
            </Badge>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="navigation">Navigation</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="usage">Usage Guide</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Variant System Overview</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert">
                <p>
                  This template includes{' '}
                  <strong>27 pre-built section component variants</strong>{' '}
                  across 9 component types. Each variant offers a different
                  visual presentation while maintaining the same core
                  functionality.
                </p>

                <h3>Quick Stats</h3>
                <ul>
                  <li>
                    <strong>Total Variants:</strong> 27+
                  </li>
                  <li>
                    <strong>Component Types:</strong> 9 (Navbar, Hero, Features,
                    Steps, Testimonials, Pricing, FAQ, CTA, Footer)
                  </li>
                  <li>
                    <strong>All TypeScript:</strong> Fully typed with
                    comprehensive interfaces
                  </li>
                  <li>
                    <strong>Documentation:</strong> Extensive JSDoc comments in
                    every file
                  </li>
                  <li>
                    <strong>Tree-shakeable:</strong> Variants are "dead code"
                    until imported
                  </li>
                </ul>

                <h3>How to Use</h3>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code>{`// Import any variant from centralized export
import { HeroSectionSplit, NavbarTransparent } from "@/components/sections";

// Or import from variants folder
import { HeroSectionSplit } from "@/components/sections/variants/hero-variants";

// Use like any component
<HeroSectionSplit
  title="Your Title"
  description="Your description"
  primaryCta={{ text: "Get Started", href: "/signup" }}
  image="/your-image.jpg"
  imagePosition="right"
/>`}</code>
                </pre>
              </CardContent>
            </Card>

            {/* Component Summary */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  name: 'Navbar',
                  count: 3,
                  variants: 'Transparent, Centered, MegaMenu',
                },
                {
                  name: 'Hero',
                  count: 4,
                  variants: 'Split, Minimal, Video, FullScreen',
                },
                {
                  name: 'Features',
                  count: 3,
                  variants: 'List, Bento, IconGrid',
                },
                {
                  name: 'Steps',
                  count: 3,
                  variants: 'Timeline, Horizontal, Cards',
                },
                {
                  name: 'Testimonials',
                  count: 3,
                  variants: 'Carousel, Masonry, QuoteWall',
                },
                {
                  name: 'Pricing',
                  count: 3,
                  variants: 'Toggle, Table, Simple',
                },
                {
                  name: 'FAQ',
                  count: 3,
                  variants: 'TwoColumn, Categorized, Searchable',
                },
                {
                  name: 'CTA',
                  count: 3,
                  variants: 'FullWidth, Split, Minimal',
                },
                {
                  name: 'Footer',
                  count: 3,
                  variants: 'Minimal, Newsletter, Mega',
                },
              ].map(component => (
                <Card key={component.name}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {component.name}
                      <Badge>{component.count} variants</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {component.variants}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Navigation Components */}
          <TabsContent value="navigation" className="space-y-8">
            <h2 className="text-3xl font-bold">Navigation Variants</h2>
            <Separator />

            {/* Navbar Variants */}
            <Card>
              <CardHeader>
                <CardTitle>Navbar Variants (3)</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="navbar-transparent">
                    <AccordionTrigger className="text-lg font-semibold">
                      1. NavbarTransparent
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div>
                        <Badge className="mb-2">Use Case</Badge>
                        <p className="text-sm text-muted-foreground">
                          Hero sections with background images/videos.
                          Transparent initially, becomes solid on scroll.
                        </p>
                      </div>
                      <div>
                        <Badge className="mb-2">Code Example</Badge>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{`import { NavbarTransparent } from "@/components/sections";

<NavbarTransparent
  brandName="MyBrand"
  links={[
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ]}
  ctaButton={{ text: "Get Started", href: "/signup" }}
/>`}</code>
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="navbar-centered">
                    <AccordionTrigger className="text-lg font-semibold">
                      2. NavbarCentered
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div>
                        <Badge className="mb-2">Use Case</Badge>
                        <p className="text-sm text-muted-foreground">
                          Distinctive layout with centered logo, links split to
                          sides. Great for portfolios and creative sites.
                        </p>
                      </div>
                      <div>
                        <Badge className="mb-2">Code Example</Badge>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{`import { NavbarCentered } from "@/components/sections";

<NavbarCentered
  brandName="MyBrand"
  leftLinks={[
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
  ]}
  rightLinks={[
    { label: "Work", href: "/work" },
    { label: "Contact", href: "/contact" },
  ]}
  ctaButton={{ text: "Get Started", href: "/signup" }}
/>`}</code>
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="navbar-megamenu">
                    <AccordionTrigger className="text-lg font-semibold">
                      3. NavbarMegaMenu
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div>
                        <Badge className="mb-2">Use Case</Badge>
                        <p className="text-sm text-muted-foreground">
                          Complex sites with many navigation items. Dropdown
                          mega menus with multi-column layouts.
                        </p>
                      </div>
                      <div>
                        <Badge className="mb-2">Code Example</Badge>
                        <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                          <code>{`import { NavbarMegaMenu } from "@/components/sections";

<NavbarMegaMenu
  brandName="MyStore"
  menuItems={[
    {
      label: "Products",
      columns: [
        {
          title: "Categories",
          links: [
            { label: "Electronics", href: "/electronics" },
            { label: "Clothing", href: "/clothing" },
          ],
        },
      ],
    },
  ]}
  simpleLinks={[
    { label: "About", href: "/about" },
  ]}
  ctaButton={{ text: "Shop Now", href: "/shop" }}
/>`}</code>
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Footer Variants */}
            <Card>
              <CardHeader>
                <CardTitle>Footer Variants (3)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Three footer variants for different needs: minimal (compact),
                  newsletter (lead capture), and mega (comprehensive).
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge>FooterMinimal</Badge>
                    <span className="text-sm text-muted-foreground">
                      Single row, 3-6 links
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>FooterNewsletter</Badge>
                    <span className="text-sm text-muted-foreground">
                      Email signup featured
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>FooterMega</Badge>
                    <span className="text-sm text-muted-foreground">
                      Large comprehensive footer
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Components */}
          <TabsContent value="content" className="space-y-8">
            <h2 className="text-3xl font-bold">Content Section Variants</h2>
            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Hero */}
              <Card>
                <CardHeader>
                  <CardTitle>Hero Variants (4)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>HeroSectionSplit:</strong> Text + image side-by-side
                  </p>
                  <p>
                    <strong>HeroSectionMinimal:</strong> Clean centered text
                    only
                  </p>
                  <p>
                    <strong>HeroSectionVideo:</strong> Background video with
                    overlay
                  </p>
                  <p>
                    <strong>HeroSectionFullScreen:</strong> Full viewport height
                  </p>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>Features Variants (3)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>FeaturesSectionList:</strong> Horizontal rows with
                    large icons
                  </p>
                  <p>
                    <strong>FeaturesSectionBento:</strong> Asymmetric mosaic
                    grid
                  </p>
                  <p>
                    <strong>FeaturesSectionIconGrid:</strong> Minimal icons +
                    titles only
                  </p>
                </CardContent>
              </Card>

              {/* Steps */}
              <Card>
                <CardHeader>
                  <CardTitle>Steps Variants (3)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>StepsSectionTimeline:</strong> Vertical timeline
                    with line
                  </p>
                  <p>
                    <strong>StepsSectionHorizontal:</strong> Horizontal progress
                    bar
                  </p>
                  <p>
                    <strong>StepsSectionCards:</strong> Simple card grid
                  </p>
                </CardContent>
              </Card>

              {/* Testimonials */}
              <Card>
                <CardHeader>
                  <CardTitle>Testimonials Variants (3)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>TestimonialsSectionCarousel:</strong> Single
                    rotating testimonial
                  </p>
                  <p>
                    <strong>TestimonialsSectionMasonry:</strong> Pinterest-style
                    variable heights
                  </p>
                  <p>
                    <strong>TestimonialsSectionQuoteWall:</strong> Minimal quote
                    display
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Conversion Components */}
          <TabsContent value="conversion" className="space-y-8">
            <h2 className="text-3xl font-bold">Conversion-Focused Variants</h2>
            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle>Pricing Variants (3)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>PricingSectionToggle:</strong> Monthly/yearly toggle
                    switch
                  </p>
                  <p>
                    <strong>PricingSectionTable:</strong> Full comparison table
                  </p>
                  <p>
                    <strong>PricingSectionSimple:</strong> Stacked single column
                  </p>
                </CardContent>
              </Card>

              {/* CTA */}
              <Card>
                <CardHeader>
                  <CardTitle>CTA Variants (3)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>CtaSectionFullWidth:</strong> Edge-to-edge banner
                  </p>
                  <p>
                    <strong>CtaSectionSplit:</strong> Image + text split layout
                  </p>
                  <p>
                    <strong>CtaSectionMinimal:</strong> Simple text with links
                  </p>
                </CardContent>
              </Card>

              {/* FAQ */}
              <Card>
                <CardHeader>
                  <CardTitle>FAQ Variants (3)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>FaqSectionTwoColumn:</strong> Questions in two
                    columns
                  </p>
                  <p>
                    <strong>FaqSectionCategorized:</strong> Tabs for categories
                  </p>
                  <p>
                    <strong>FaqSectionSearchable:</strong> Search with real-time
                    filtering
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Usage Guide */}
          <TabsContent value="usage" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Quick Start Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    1. Choose Your Variant
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Browse the sections above to find the variant that matches
                    your needs.
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Consider visual style (minimal vs. bold)</li>
                    <li>Think about content amount (how many items?)</li>
                    <li>Match to user journey stage</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    2. Import the Component
                  </h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{`// From centralized export (recommended)
import { HeroSectionSplit, FeaturesSectionBento } from "@/components/sections";

// From specific variant file (alternative)
import { HeroSectionSplit } from "@/components/sections/variants/hero-variants";`}</code>
                  </pre>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    3. Use the Component
                  </h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{`export default function MyLandingPage() {
  return (
    <div>
      <HeroSectionSplit
        title="Welcome to Our Product"
        description="The best solution for your needs"
        primaryCta={{ text: "Get Started", href: "/signup" }}
        image="/hero-image.png"
        imagePosition="right"
      />

      <FeaturesSectionBento
        title="Amazing Features"
        featuredIndex={0}
        features={[
          {
            icon: Zap,
            title: "Fast",
            description: "Lightning-fast performance",
          },
          // ... more features
        ]}
      />
    </div>
  );
}`}</code>
                  </pre>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    4. Customize as Needed
                  </h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>
                      All variants accept className prop for additional styling
                    </li>
                    <li>Check component JSDoc for variant-specific props</li>
                    <li>Variants maintain type safety with TypeScript</li>
                    <li>Feel free to copy and modify variant code directly</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Best Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">✅ DO:</h4>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Mix and match variants across sections</li>
                      <li>Use consistent visual weight throughout page</li>
                      <li>Test different variants for A/B testing</li>
                      <li>Read JSDoc comments in variant files</li>
                      <li>Maintain type safety</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">❌ DON'T:</h4>
                    <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                      <li>Mix too many different styles on one page</li>
                      <li>
                        Use bold variants for every section (overwhelming)
                      </li>
                      <li>Ignore mobile responsiveness testing</li>
                      <li>Forget to provide all required props</li>
                      <li>Override core functionality</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16 bg-card">
        <div className="container mx-auto px-4 py-8">
          <p className="text-sm text-muted-foreground text-center">
            This is an internal reference page. For full documentation, see
            AGENTS.md
          </p>
        </div>
      </footer>
    </div>
  );
}
