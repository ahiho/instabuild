import { Footer } from '../components/layout/Footer';
import { Header } from '../components/layout/Header';
import { Hero } from '../components/layout/Hero';

export function HomePage() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Header */}
      <Header />

      {/* Hero Section with Particle Background */}
      <Hero />

      {/* Additional content sections can go here */}

      <Footer />
    </div>
  );
}
