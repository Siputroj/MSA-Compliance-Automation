"use client";

import React, { useEffect, useState } from "react";

interface ScoreMeterProps {
  score: number; // 0 to 100
}

export default function ScoreMeter({ score }: ScoreMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  
  useEffect(() => {
    // Trigger smooth stroke offset transition after render
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 150);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference - (animatedScore / 100) * circumference;

  // Determine indicator color based on score threshold
  const getScoreColor = (val: number): string => {
    if (val >= 90) return "var(--color-compliant)";
    if (val >= 60) return "var(--color-warning)";
    return "var(--color-non-compliant)";
  };

  const getScoreLabel = (val: number): string => {
    if (val >= 90) return "EXCELLENT";
    if (val >= 60) return "NEEDS REVIEW";
    return "HIGH RISK";
  };

  return (
    <div className="score-meter-container glass-card">
      <div className="score-meter-header-row">
        <h3 className="score-meter-title">Compliance Rating</h3>
        <button
          className="score-info-toggle-btn"
          onClick={() => setShowExplanation(!showExplanation)}
          title="How is this calculated?"
          aria-label="Toggle score explanation"
        >
          <svg className="score-info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </button>
      </div>

      <div className="radial-gauge-wrapper">
        <svg className="radial-gauge-svg" width="160" height="160" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={getScoreColor(animatedScore)} stopOpacity="0.8" />
              <stop offset="100%" stopColor={getScoreColor(animatedScore)} stopOpacity="1" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Background circular track */}
          <circle
            className="radial-gauge-track"
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="8"
          />

          {/* Active progress ring */}
          <circle
            className="radial-gauge-progress"
            cx="60"
            cy="60"
            r={radius}
            fill="transparent"
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
            filter="url(#glow)"
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>

        {/* Center overlay labels */}
        <div className="radial-gauge-center">
          <span className="gauge-score-value">{Math.round(animatedScore)}%</span>
          <span className="gauge-score-label" style={{ color: getScoreColor(animatedScore) }}>
            {getScoreLabel(animatedScore)}
          </span>
        </div>
      </div>
      <p className="score-meter-footer">
        Based on {getScoreLabel(animatedScore).toLowerCase()} match of clauses against declarative company policy.
      </p>

      {showExplanation && (
        <div className="score-explanation-box animate-slide-down">
          <span className="score-explanation-formula">
            Formula: <code>(Passed Rules / Total Rules) &times; 100</code>
          </span>
          <ul className="score-explanation-list">
            <li>
              • <strong>Passed</strong>: Audits evaluated as <code>COMPLIANT</code> or <code>NOT_FOUND</code> (risk clause is absent).
            </li>
            <li>
              • <strong>Failed</strong>: Audits evaluated as <code>NON_COMPLIANT</code> or <code>WARNING</code>.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
