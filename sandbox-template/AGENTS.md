# Vite Template - AI Agent Guide

**🤖 Optimized for AI coding assistants**

## Quick Reference

**Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui + Framer Motion

**Import Paths** (most common errors):

```typescript
// Section components (9 pre-built)
import { Navbar, HeroSection, FeaturesSection } from '@/components/sections';

// UI primitives (56+ shadcn components)
import { Button, Card, Badge } from '@/components/ui/button';

// Utils
import { cn } from '@/lib/utils';

// Animations
import { fadeInUp, staggerContainer } from '@/lib/animations';
```

**9 Section Components**: Navbar, HeroSection, FeaturesSection, StepsSection, TestimonialsSection, PricingSection, FaqSection, CtaSection, Footer

**Variants**: 27+ variants in `@/components/sections/variants/` (NavbarTransparent, HeroSectionSplit, etc.)

---

## Development Essentials

### TypeScript

**Pattern**:

```typescript
import { cn } from '@/lib/utils';

interface ComponentProps {
  title: string;
  description?: string;
  className?: string;
}

export function Component({ title, description, className }: ComponentProps) {
  return (
    <div className={cn('default-classes', className)}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
```

**Rules**: `interface` for props, `type` for unions, strict mode enabled

### Tailwind

**❌ NEVER create .css files** (only modify `index.css` for theme colors)
**✅ ONLY use Tailwind utilities in TSX**

**Patterns**:

```typescript
// Conditional
<div className={cn('base', isActive && 'active', className)} />

// Responsive
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

// Semantic tokens
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// Container
<section className="py-16 px-4">
  <div className="container mx-auto max-w-6xl">
```

**Theme colors** (edit `src/index.css`):

```css
:root {
  --primary: oklch(0.5 0.2 250);
} /* Light */
.dark {
  --primary: oklch(0.7 0.2 250);
} /* Dark */
```

### shadcn/ui (56+ Components)

Button, Card, Dialog, Input, Select, Badge, Avatar, Accordion, Tabs, Toast, etc.

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>
    <Button variant="outline" size="lg">Click</Button>
  </CardContent>
</Card>
```

Most have `variant` and `size` props.

### Lucide Icons

**❌ CRITICAL ERROR: Icons are React components, NOT strings**

```typescript
// ❌ WRONG - Icons as strings (causes TypeScript errors)
<FeaturesSection
  features={[
    { icon: "Zap", title: "Fast" },      // ERROR: Type 'string' not assignable to 'LucideIcon'
    { icon: "Shield", title: "Secure" }
  ]}
/>

// ✅ CORRECT - Import icons as components
import { Zap, Shield, Rocket } from "lucide-react";

<FeaturesSection
  features={[
    { icon: Zap, title: "Fast" },        // ✅ Zap is a component reference
    { icon: Shield, title: "Secure" }    // ✅ Shield is a component reference
  ]}
/>
```

**Import pattern:**

- Icons are in `lucide-react` package (already installed)
- Use PascalCase names: `Zap`, `ArrowRight`, `CheckCircle`, `Sparkles`
- Import at top of file: `import { IconName } from "lucide-react";`
- Pass component reference (not string, not JSX like `<Zap />`)

**Common icons:**
Zap, Shield, Rocket, Star, Heart, CheckCircle, ArrowRight, TrendingUp, Users, Sparkles, Settings, Menu, X, ChevronRight, Play, Clock, Globe, Lock, Mail, Search, Code, Database, Cloud, Cpu, Activity, Award, Bell, Book, Briefcase, Calendar, Camera, Check, Download, Eye, FileText, Gift, Grid, HelpCircle, Home, Image, Layers, Link, MessageCircle, Monitor, Package, PieChart, Plus, RefreshCw, Save, Send, Share, ShoppingCart, Trash, Upload, Video, Wallet, Wifi, Zap

**Icon props** (when rendering directly):

```typescript
<Zap className="size-6 text-primary" />
<ArrowRight size={24} color="red" strokeWidth={2} />
```

### Images & Assets

**Working with Images (3 Options)**

**Option 1 (Best): Fetch real images from Unsplash**

Use the `fetch_images` tool to get professional, high-quality photos:

```typescript
// 1. Call fetch_images tool (GPT-4o does this via tool call)
// fetch_images({ query: "modern office workspace", count: 1, orientation: "landscape" })

// 2. Tool returns URL and attribution - use directly in components:
<HeroSection
  title="Build Better Products"
  description="Transform your workflow"
  image="https://images.unsplash.com/photo-xxxxx?ixid=..."
  primaryCta={{ text: "Get Started", href: "#signup" }}
/>

// 3. MUST include attribution near image (provided by tool):
<div className="text-sm text-muted-foreground">
  Photo by <a href="https://unsplash.com/@photographer">John Doe</a> on{' '}
  <a href="https://unsplash.com">Unsplash</a>
</div>
```

**Option 2 (Fallback): PlaceholderImage component**

If `fetch_images` fails or API unavailable, use PlaceholderImage (powered by picsum.photos):

```typescript
import { PlaceholderImage } from '@/components/ui/placeholder-image';

// Basic usage - random beautiful image from picsum.photos
<PlaceholderImage width={1200} height={600} />

// Hero section with blur effect
<PlaceholderImage width={1200} height={600} blur={true} className="rounded-xl" />

// Consistent image using seed (same seed = same image every time)
<PlaceholderImage width={800} height={600} seed={42} />

// Grayscale for testimonials or minimalist design
<PlaceholderImage width={400} height={400} grayscale={true} className="rounded-full" />

// Square image
<PlaceholderImage width={600} height={600} />
```

**PlaceholderImage Features:**

- ✅ No API key required
- ✅ Beautiful, random photos from picsum.photos
- ✅ Fast CDN delivery
- ✅ Optional blur, grayscale effects
- ✅ Seed support for consistent images

**Option 3 (No images): Omit image props**

Components handle missing images gracefully:

```typescript
// No image prop = no image section rendered (perfectly valid)
<HeroSection
  title="Build Better Products"
  description="Transform your workflow"
  primaryCta={{ text: "Get Started", href: "#signup" }}
/>
```

**Image Selection Guidelines:**

- **Hero sections**: `orientation: "landscape"`, queries: "modern office", "technology", "business meeting"
- **Features**: `orientation: "squarish"`, queries: "collaboration", "innovation", "productivity"
- **Testimonials**: `orientation: "portrait"`, queries: "professional headshot", "business person"
- **Call-to-Action**: `orientation: "landscape"`, queries: "success", "celebration", "growth"

**NEVER**: Use fake URLs like `"https://example.com/hero.jpg"` - causes broken images

---

## Landing Page Components

Import: `import { Navbar, HeroSection, FeaturesSection } from "@/components/sections"`

### 1. Navbar

```typescript
<Navbar
  brandName="Product"
  links={[{ label: "Features", href: "#features" }]}
  ctaButton={{ text: "Sign Up", href: "#signup" }}
/>
```

**Variants**: NavbarTransparent, NavbarCentered, NavbarMegaMenu

### 2. HeroSection

```typescript
<HeroSection
  title="Build Beautiful Landing Pages"
  description="Create stunning pages with pre-built components"
  primaryCta={{ text: "Get Started", href: "#signup" }}
  secondaryCta={{ text: "Learn More", href: "#about" }}  // Optional
  badge="New"  // Optional
  image="/hero.png"  // Optional
/>
```

**Variants**: HeroSectionSplit, HeroSectionMinimal, HeroSectionVideo, HeroSectionFullScreen

### 3. FeaturesSection

```typescript
import { Zap, Shield, Rocket } from "lucide-react";

<FeaturesSection
  title="Why Choose Us"
  features={[
    { icon: Zap, title: "Fast", description: "Lightning fast" },
    { icon: Shield, title: "Secure", description: "Enterprise security" },
  ]}
/>
```

**Variants**: FeaturesSectionList, FeaturesSectionBento, FeaturesSectionIconGrid

### 4. StepsSection

```typescript
<StepsSection
  title="Get Started"
  steps={[
    { number: 1, title: "Sign Up", description: "Create account" },
    { number: 2, title: "Customize", description: "Configure settings" },
  ]}
/>
```

**Variants**: StepsSectionTimeline, StepsSectionHorizontal, StepsSectionCards

### 5. TestimonialsSection

```typescript
<TestimonialsSection
  title="Loved by Thousands"
  testimonials={[
    {
      content: "This changed my workflow!",
      author: "Jane Doe",
      role: "CEO",
      rating: 5,
    },
  ]}
/>
```

**Variants**: TestimonialsSectionCarousel, TestimonialsSectionMasonry, TestimonialsSectionQuoteWall

### 6. PricingSection

```typescript
<PricingSection
  title="Pricing"
  pricingTiers={[
    {
      name: "Starter",
      price: "$9",
      period: "month",
      features: ["5 projects", "10GB storage"],
      cta: { text: "Start", href: "#signup" },
      popular: true,  // Highlights this tier
    },
  ]}
/>
```

**Variants**: PricingSectionToggle, PricingSectionTable, PricingSectionSimple

### 7. FaqSection

```typescript
<FaqSection
  title="FAQ"
  faqs={[
    { question: "How does it work?", answer: "It's simple..." },
  ]}
/>
```

**Variants**: FaqSectionTwoColumn, FaqSectionCategorized, FaqSectionSearchable

### 8. CtaSection

```typescript
<CtaSection
  title="Ready to Start?"
  description="Join thousands today"
  primaryCta={{ text: "Sign Up", href: "#signup" }}
/>
```

**Variants**: CtaSectionFullWidth, CtaSectionSplit, CtaSectionMinimal

### 9. Footer

```typescript
<Footer
  companyName="Company"
  columns={[
    {
      title: "Product",
      links: [{ label: "Features", href: "#features" }],
    },
  ]}
  socialLinks={{ twitter: "https://twitter.com/handle" }}
/>
```

**Variants**: FooterMinimal, FooterNewsletter, FooterMega

### Complete Example

```typescript
import { Navbar, HeroSection, FeaturesSection, Footer } from "@/components/sections";
import { Zap } from "lucide-react";

export function LandingPage() {
  return (
    <>
      <Navbar brandName="Product" links={[...]} ctaButton={{...}} />
      <main>
        <HeroSection title="..." description="..." primaryCta={{...}} />
        <FeaturesSection title="..." features={[{ icon: Zap, ... }]} />
      </main>
      <Footer companyName="Product" columns={[...]} />
    </>
  );
}
```

---

## Animations & Forms

### Animations

```typescript
import { fadeInUp, staggerContainer, staggerItem, transitions, viewportOptions } from "@/lib/animations";
import { motion } from "framer-motion";

// Basic
<motion.div variants={fadeInUp} initial="hidden" whileInView="visible" viewport={viewportOptions}>
  Content
</motion.div>

// Stagger (lists)
<motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={viewportOptions}>
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>{item.content}</motion.div>
  ))}
</motion.div>
```

**Presets**: fadeInUp, fadeInDown, fadeInLeft, fadeInRight, scaleIn, slideInLeft, staggerContainer, staggerItem
**Transitions**: default, smooth, spring, bouncy, fast, slow

### Forms (React Hook Form + Zod)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function LoginForm() {
  const form = useForm({ resolver: zodResolver(schema) });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(data => console.log(data))}>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl><Input {...field} /></FormControl>
          </FormItem>
        )} />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

---

## Common Patterns

```typescript
// Theme Toggle
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      <Sun className="dark:scale-0" />
      <Moon className="absolute scale-0 dark:scale-100" />
    </Button>
  );
}

// Dialog
import { useState } from 'react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export function MyDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
      <DialogContent>{/* Content */}</DialogContent>
    </Dialog>
  );
}
```

---

**Last Updated**: 2025-11-17 | **Version**: 3.1.0 (Agent-Optimized)
