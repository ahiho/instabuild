import { Canvas } from '@react-three/fiber';
import { Effects } from '@react-three/drei';
import { ArrowRight } from 'lucide-react';
import { VignetteShader } from '../../shaders/vignetteShader';
import { Particles } from '../home/Particles';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const suggestions = [
  'A sleek landing page for a new AI-powered code editor...',
  'A vibrant and playful homepage for a dog-walking service...',
  'An elegant and minimalist portfolio for a photographer...',
  'A modern and professional website for a real estate agency...',
];

export function Hero() {
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleTyping = () => {
      const currentSuggestion = suggestions[suggestionIndex];
      if (isDeleting) {
        // Deleting
        if (displayedText.length > 0) {
          setDisplayedText(currentSuggestion.substring(0, displayedText.length - 1));
        } else {
          setIsDeleting(false);
          setSuggestionIndex((prevIndex) => (prevIndex + 1) % suggestions.length);
        }
      } else {
        // Typing
        if (displayedText.length < currentSuggestion.length) {
          setDisplayedText(currentSuggestion.substring(0, displayedText.length + 1));
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
    <section className="relative w-full h-screen overflow-hidden bg-[#0a0e27]">
      {/* Waving particle background */}
      <div className="absolute inset-0">
        <Canvas
          camera={{
            position: [1, 2.66, -1.2],
            fov: 40,
            near: 0.01,
            far: 300,
          }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#0a0e27']} />
          <Particles
            speed={1.0} // Controls the speed of the morphing/flowing distortion
            aperture={1.5}
            focus={3.8}
            size={512}
            noiseScale={0.24} // Controls the scale of the distortion
            noiseIntensity={1} // Controls the amount of distortion
            timeScale={0.3}
            pointSize={8}
            opacity={0.75}
            planeScale={12.0}
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
          <h1 className="text-5xl font-bold text-white mb-4">
            Bring your <span className="font-serif italic text-purple-300">ideal</span> landing page to life.
          </h1>
          <p className="text-md text-gray-400">
            Let our AI bring it to life. No code required.
          </p>
        </motion.div>
        <motion.div className="w-full max-w-2xl p-4" variants={itemVariants}>
          <div className="relative bg-black/40 backdrop-blur-sm rounded-xl shadow-2xl border border-purple-500/20 transition-all duration-300 focus-within:border-purple-500 focus-within:shadow-[-_0px_0px_30px_5px_rgba(168,_85,_247,_0.2)] focus-within:scale-[102%]">
            <textarea
              className="w-full h-24 p-4 bg-transparent text-white placeholder-gray-400 rounded-xl focus:outline-none resize-none"
              placeholder={displayedText}
            />
            <button className="absolute bottom-4 right-4 flex items-center justify-center size-8 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md transition-colors">
              <ArrowRight className="size-4" />
            </button>
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">
            Trusted by <span className="font-bold text-purple-300">1M+</span> creators worldwide.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
