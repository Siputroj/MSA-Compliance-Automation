"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HealthStatus } from "@/types/compliance";

interface HeaderProps {
  health: HealthStatus | null;
  onRefreshHealth: () => void;
}

export default function Header({ health, onRefreshHealth }: HeaderProps) {
  const isConnected = health !== null;
  const pathname = usePathname();

  return (
    <header className="header glass-card">
      <div className="header-brand">
        <svg
          className="brand-icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="brand-text">MSA Audit</span>
        <span className="brand-badge">Compliance Engine</span>
      </div>

      <nav className="header-nav">
        <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
          Single Audit
        </Link>
        <Link href="/batch" className={`nav-link ${pathname === "/batch" ? "active" : ""}`}>
          Batch Audit
        </Link>
      </nav>

      <div className="header-status-panel">
        {/* Backend Connectivity Status */}
        <div className="status-item">
          <span className="status-label">API Backend:</span>
          <div className="status-badge-container">
            <span
              className={`status-dot ${isConnected ? "status-dot-active" : "status-dot-inactive"}`}
            />
            <span className="status-badge-text">
              {isConnected ? "Connected" : "Offline"}
            </span>
          </div>
        </div>

        {isConnected && (
          <>
            {/* Apple MLX Acceleration Status */}
            <div className="status-item">
              <span className="status-label">Apple MLX Acceleration:</span>
              <span
                className={`status-text-badge ${
                  health.mlx_available ? "badge-success" : "badge-neutral"
                }`}
              >
                {health.mlx_available ? "Hardware GPU Enabled" : "Not Detected"}
              </span>
            </div>

            {/* Inference Mode Status */}
            <div className="status-item">
              <span className="status-label">Inference Mode:</span>
              <span
                className={`status-text-badge ${
                  health.dry_run_active ? "badge-warning" : "badge-live"
                }`}
              >
                {health.dry_run_active ? "Dry-Run Heuristics" : "Live Qwen LLM"}
              </span>
            </div>
          </>
        )}

        <button
          className="refresh-btn"
          onClick={onRefreshHealth}
          title="Refresh connection status"
          aria-label="Refresh connection"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18v3z"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
