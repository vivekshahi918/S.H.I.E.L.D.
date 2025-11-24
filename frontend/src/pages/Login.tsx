import { Shield, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Login() {
  const [rainbowActive, setRainbowActive] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [featureIndex, setFeatureIndex] = useState(0);

  // The text to animate
  const titleText = "S.H.I.E.L.D.".split(""); 

  // Feature list
  const features = [
    { letter: "S", text: "ecure Authentication" },
    { letter: "H", text: "istory Archiving" },
    { letter: "I", text: "ntelligence" },
    { letter: "E", text: "ncryption" },
    { letter: "L", text: "ogs & Auditing" },
    { letter: "D", text: "ata Leakage Prevention" },
  ];

  useEffect(() => {
    // CALCULATION:
    // 12 chars * 250ms spacing = Last letter starts at 2750ms
    // Animation duration = 600ms
    // Total time until last letter finishes = ~3350ms
    const timeUntilComplete = (titleText.length * 250) + 600;

    // 1. Activate Multicolor Rainbow strictly AFTER the word is complete
    const colorTimer = setTimeout(() => {
      setRainbowActive(true);
    }, timeUntilComplete + 100); 

    // 2. Show Description 1 second after color appears
    const descTimer = setTimeout(() => {
      setShowDescription(true);
    }, timeUntilComplete + 1100);

    return () => {
      clearTimeout(colorTimer);
      clearTimeout(descTimer);
    };
  }, []);

  // Cycle the description text every 2 seconds
  useEffect(() => {
    if (!showDescription) return;
    const interval = setInterval(() => {
      setFeatureIndex((prev) => (prev + 1) % features.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [showDescription]);

  const handleLogin = () => {
    window.location.href = 'http://localhost:3000/auth/google';
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-900 text-white overflow-hidden">
      <style>{`
        /* 1. The Multicolor Effect (Hyper Rainbow) */
        @keyframes hyperRainbow {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        /* 2. The Smash Animation */
        @keyframes smashIn {
          0% {
            opacity: 0;
            transform: scale(5) translateZ(0) rotate(-20deg);
            filter: blur(10px);
          }
          60% {
            opacity: 1;
            transform: scale(0.9) rotate(5deg);
            filter: blur(0px);
          }
          80% {
            transform: scale(1.05) rotate(-2deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        .animate-hyper-rainbow {
          background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3, #ff0000);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: hyperRainbow 0.2s linear infinite;
        }

        .letter-smash {
          display: inline-block;
          opacity: 0;
          animation: smashIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>

      <div className="text-center space-y-3.5 p-10 bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 z-10">
        
        {/* Logo Section */}
        <div className="flex justify-center">
          <div className="p-4 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20 relative transition-transform hover:scale-110 duration-300">
            <Shield size={40} className="relative z-10" />
            <div className="absolute -bottom-1 -right-1 bg-slate-900 p-1 rounded-full">
               <Mail size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* TITLE AREA */}
        <div className="h-14 flex items-center justify-center overflow-visible">
          <h1 
            className={`text-4xl font-black tracking-widest transition-all duration-300 ${rainbowActive ? 'animate-hyper-rainbow' : 'text-white'}`}
          >
            {/* FIX: If rainbow is active, show plain text (fixes disappearing bug). If not, show animated letters. */}
            {rainbowActive ? (
              "S.H.I.E.L.D."
            ) : (
              titleText.map((char, index) => (
                <span 
                  key={index}
                  className="letter-smash"
                  style={{ 
                    animationDelay: `${index * 250}ms`
                  }}
                >
                  {char}
                </span>
              ))
            )}
          </h1>
        </div>
        
        {/* DESCRIPTION AREA */}
        <div className="h-8 flex items-center justify-center">
          {showDescription ? (
            <p className="text-gray-400 text-lg flex items-baseline justify-center gap-[1px] animate-in fade-in zoom-in duration-500">
              <span className="font-bold text-blue-500 text-2xl leading-none">
                {features[featureIndex].letter}
              </span>
              <span 
                key={featureIndex} 
                className="leading-none animate-in fade-in slide-in-from-bottom-2 duration-500"
              >
                {features[featureIndex].text}
              </span>
            </p>
          ) : (
            <div className="h-full"></div>
          )}
        </div>
        
        {/* Login Button */}
        <button
          onClick={handleLogin}
          className="w-full bg-white text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-gray-200 hover:shadow-lg transition-all flex items-center justify-center gap-3 mt-4 active:scale-95"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
        {/* 🆕 ADD THIS NOTE FOR RECRUITERS */}
        <div className="text-xs text-gray-500 mt-4 border-t border-gray-700 pt-4 text-left">
          <p className="font-bold text-gray-400 mb-1">Note:</p>
          <p>
            Since this is a student project, Google may show an "Unverified App" warning. 
            <br/><br/>
            Click <strong>"Advanced"</strong> (bottom left) → <strong>"Go to Email Archiver (unsafe)"</strong> to proceed.
          </p>
        </div>
      </div>
    </div>
  );
}