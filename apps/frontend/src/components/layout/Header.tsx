import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserMenu } from '../auth/UserMenu';
import { Button } from '../ui/button';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignIn = () => {
    navigate('/auth/login');
  };

  const handleGetStarted = () => {
    navigate('/auth/register');
  };

  return (
    <motion.header
      className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${
          isScrolled
            ? 'bg-black/75 backdrop-blur-md shadow-sm'
            : 'bg-transparent'
        }
      `}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded flex items-center justify-center group-hover:opacity-80 transition-opacity duration-200">
              <span className="text-white font-bold text-lg sm:text-xl">
                IB
              </span>
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white">
              InstaBuild
            </span>
          </Link>

          {/* Navigation Links - Hidden on mobile */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <a
              href="#features"
              className="text-gray-300 hover:text-white font-medium transition-colors duration-200"
            >
              Features
            </a>
            <a
              href="#examples"
              className="text-gray-300 hover:text-white font-medium transition-colors duration-200"
            >
              Examples
            </a>
            <a
              href="#pricing"
              className="text-gray-300 hover:text-white font-medium transition-colors duration-200"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-gray-300 hover:text-white font-medium transition-colors duration-200"
            >
              FAQ
            </a>
            {isAuthenticated && (
              <Link
                to="/dashboard"
                className="text-gray-300 hover:text-white font-medium transition-colors duration-200"
              >
                Dashboard
              </Link>
            )}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={handleSignIn}
                  className="hidden sm:inline-flex text-white hover:text-gray-300 hover:bg-white/10"
                >
                  Sign In
                </Button>
                <Button
                  onClick={handleGetStarted}
                  className="
                    bg-black
                    hover:bg-gray-900
                    text-white font-semibold
                    border border-white/20
                    hover:border-white/40
                    transition-all duration-200
                    px-4 sm:px-6
                  "
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};
