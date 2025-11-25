import { Effects } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { VignetteShader } from '../../shaders/vignetteShader';
import { conversationService } from '../../services/project';
import { SignInPopup } from '../auth/SignInPopup';
import { Particles } from '../home/Particles';

const suggestions = [
  'A sleek landing page for a new AI-powered code editor...',
  'A vibrant and playful homepage for a dog-walking service...',
  'An elegant and minimalist portfolio for a photographer...',
  'A modern and professional website for a real estate agency...',
];

export function Hero() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { createProject } = useProject();
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const [showSignInPopup, setShowSignInPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Guard against duplicate calls
  const isMobile = useMediaQuery('(max-width: 768px)');
  const fov = isMobile ? 55 : 45;

  useEffect(() => {
    const handleTyping = () => {
      const currentSuggestion = suggestions[suggestionIndex];
      if (isDeleting) {
        // Deleting
        if (displayedText.length > 0) {
          setDisplayedText(
            currentSuggestion.substring(0, displayedText.length - 1)
          );
        } else {
          setIsDeleting(false);
          setSuggestionIndex(prevIndex => (prevIndex + 1) % suggestions.length);
        }
      } else {
        // Typing
        if (displayedText.length < currentSuggestion.length) {
          setDisplayedText(
            currentSuggestion.substring(0, displayedText.length + 1)
          );
        } else {
          // Wait for a bit then start deleting
          setTimeout(() => setIsDeleting(true), 2000);
        }
      }
    };

    const typingSpeed = isDeleting ? 20 : 40;
    const timeout = setTimeout(handleTyping, typingSpeed);

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, suggestionIndex]);

  /**
   * Handle the "Next" button click to create a new project and conversation
   */
  const handleNext = async () => {
    // Validate input
    if (!userInput.trim()) {
      setError('Please enter a description for your landing page');
      return;
    }

    // Check authentication first
    if (!isAuthenticated) {
      // Store query in localStorage for after login
      localStorage.setItem('pendingHeroQuery', userInput.trim());
      setShowSignInPopup(true);
      toast.error('Authentication Required', {
        description: 'Please sign in to create your landing page',
      });
      return;
    }

    // If authenticated, call handleAuthSuccess directly
    await handleAuthSuccess();
  };

  const handleAuthSuccess = async () => {
    // Guard against duplicate calls (can happen in StrictMode or due to event handlers firing twice)
    if (isProcessing) {
      console.log('[Hero] Ignoring duplicate handleAuthSuccess call');
      return;
    }

    // Get stored query from localStorage
    const storedQuery = localStorage.getItem('pendingHeroQuery');
    const queryToUse = storedQuery || userInput.trim();

    if (!queryToUse) {
      return;
    }

    try {
      setIsProcessing(true);
      setIsLoading(true);
      setError(null);

      // Create new project with a generated name
      const projectName = `Project ${new Date().toLocaleDateString()}`;
      const newProject = await createProject(projectName, queryToUse);

      // Create new conversation in the project with idempotency key to prevent duplicates
      const idempotencyKey = `hero-${Date.now()}-${Math.random()}`;
      const conversation = await conversationService.createConversation({
        projectId: newProject.id,
        title: 'New Conversation',
        idempotencyKey,
      });

      // Clear stored query
      localStorage.removeItem('pendingHeroQuery');

      // Navigate to editor with conversation ID and pass the query as state
      navigate(`/editor/${conversation.id}`, {
        state: { initialMessage: queryToUse },
      });

      toast.success('Project created!', {
        description: 'Your new project is ready',
      });
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('Failed to create project', {
        description: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <section className="relative w-full h-screen overflow-hidden bg-black">
      {/* Waving particle background */}
      <div className="absolute inset-0">
        <Canvas
          camera={{
            position: [1.2, 2.8, -1.3],
            fov,
            near: 0.01,
            far: 300,
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#000000']} />
          <Particles
            speed={1.0}
            aperture={1.4}
            focus={3.8}
            size={512}
            noiseScale={0.3} // Controls the scale of the distortion
            noiseIntensity={1.1} // Controls the amount of distortion
            timeScale={0.3}
            pointSize={8}
            opacity={0.75}
            planeScale={12}
          />
          <Effects multisamping={0} disableGamma>
            <shaderPass
              args={[VignetteShader]}
              uniforms-darkness-value={1.5}
              uniforms-offset-value={0.4}
            />
          </Effects>
        </Canvas>
      </div>

      {/* Hero content */}
      <motion.div
        className="relative z-10 flex flex-col items-center justify-center h-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="text-center" variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Bring your&nbsp;
            <span className="font-serif italic text-purple-300">
              ideal
            </span>{' '}
            landing&nbsp;page&nbsp;to&nbsp;life.
          </h1>
          <p className="text-md text-gray-400">
            Let our AI bring it to life. No code required.
          </p>
        </motion.div>
        <motion.div className="w-full max-w-2xl p-4" variants={itemVariants}>
          <div className="relative bg-black/40 backdrop-blur-sm rounded-xl shadow-2xl border border-purple-500/20 transition-all duration-300 focus-within:border-purple-500 focus-within:shadow-[-_0px_0px_30px_5px_rgba(168,_85,_247,_0.2)] focus-within:scale-[102%]">
            <textarea
              className="w-full h-24 p-4 bg-transparent text-white placeholder-gray-400 rounded-xl focus:outline-none resize-none"
              placeholder={
                displayedText + (userInput === '' && !isFocused ? '|' : '')
              }
              value={userInput}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleNext();
                }
              }}
              disabled={isLoading}
            />
            <button
              onClick={handleNext}
              disabled={isLoading || !userInput.trim() || authLoading}
              className="absolute bottom-4 right-4 flex items-center justify-center size-8 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-center mt-2">
              <p className="text-sm text-red-400 mb-2">{error}</p>
            </div>
          )}

          {/* Success message */}
          {!error && (
            <p className="text-center text-sm text-gray-400 mt-2">
              Trusted by <span className="font-bold text-purple-300">1M+</span>{' '}
              creators worldwide.
            </p>
          )}
        </motion.div>
      </motion.div>

      {/* Sign In Popup */}
      <SignInPopup
        isOpen={showSignInPopup}
        onClose={() => setShowSignInPopup(false)}
        onSuccess={handleAuthSuccess}
      />
    </section>
  );
}
