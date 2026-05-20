import React, { useState, useEffect } from 'react';
import './RealHome.css';

/**
 * COUNTDOWN TIMER WITH THEMES
 * 
 * Multiple gradient themes to choose from:
 * - Purple Dream (original design)
 * - Ocean Breeze
 * - Sunset Glow
 * - Mint Fresh
 * - Rose Garden
 */

const THEMES = {
  purple: {
    name: 'Purple Dream',
    gradient: 'linear-gradient(135deg, #ede9fe 0%, #fbcfe8 50%, #ddd6fe 100%)',
    accent: '#7c3aed'
  },
  ocean: {
    name: 'Ocean Breeze',
    gradient: 'linear-gradient(135deg, #dbeafe 0%, #cffafe 50%, #bfdbfe 100%)',
    accent: '#0ea5e9'
  },
  sunset: {
    name: 'Sunset Glow',
    gradient: 'linear-gradient(135deg, #fed7aa 0%, #fbcfe8 50%, #fecdd3 100%)',
    accent: '#fb923c'
  },
  mint: {
    name: 'Mint Fresh',
    gradient: 'linear-gradient(135deg, #d1fae5 0%, #ccfbf1 50%, #a7f3d0 100%)',
    accent: '#10b981'
  },
  rose: {
    name: 'Rose Garden',
    gradient: 'linear-gradient(135deg, #fbcfe8 0%, #ffe4e6 50%, #fecdd3 100%)',
    accent: '#ec4899'
  }
};

function CountdownTimerWithThemes() {
  const [currentTheme, setCurrentTheme] = useState('purple');
  const [targetDate] = useState(new Date('2026-09-20T23:59:59'));
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num) => num.toString().padStart(2, '0');

  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const theme = THEMES[currentTheme];

  return (
    <div className="countdown-page">
      <div className="countdown-card" style={{ backgroundImage: theme.gradient }}>
        <div className="countdown-top-row">
          <div></div>
          <div className="countdown-theme-toggle">
            <button
              onClick={() => setShowThemeSelector(!showThemeSelector)}
              className="countdown-button"
            >
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span>Theme</span>
            </button>

            {showThemeSelector && (
              <div className="countdown-dropdown">
                {Object.keys(THEMES).map((themeKey) => {
                  const themeItem = THEMES[themeKey];
                  return (
                    <button
                      key={themeKey}
                      onClick={() => {
                        setCurrentTheme(themeKey);
                        setShowThemeSelector(false);
                      }}
                      className={`countdown-dropdown-button ${currentTheme === themeKey ? 'active' : ''}`}
                    >
                      <div className="theme-item-label">
                        <span className="theme-dot" style={{ backgroundColor: themeItem.accent }}></span>
                        <span>{themeItem.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="countdown-title-row">
          <h2 className="countdown-title">DAYS LEFT UNTIL BOARD EXAM</h2>
        </div>

        <div className="countdown-grid">
          <TimeUnit value={formatNumber(timeLeft.days)} label="DAYS" />
          <TimeUnit value={formatNumber(timeLeft.hours)} label="HRS" />
          <TimeUnit value={formatNumber(timeLeft.minutes)} label="MINS" />
          <TimeUnit value={formatNumber(timeLeft.seconds)} label="SECS" />
        </div>

        <div className="countdown-action-row">
          <button className="countdown-action-button">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span>English</span>
          </button>
        </div>

        <div className="countdown-info-box">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formatDate(targetDate)}</span>
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label }) {
  return (
    <div className="countdown-unit">
      <p className="countdown-value">{value}</p>
      <p className="countdown-label">{label}</p>
    </div>
  );
}

export default CountdownTimerWithThemes;
