/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * GSPME - Logo Officiel de la Plateforme (Cloud PME Africaines & Croissance Connectée)
 */

import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  showTagline?: boolean;
  variant?: 'light' | 'dark'; // 'dark' pour fond sombre (sidebar), 'light' pour fond clair
  className?: string;
  onClick?: () => void;
}

export function BrandLogo({
  size = 'md',
  showText = true,
  showTagline = false,
  variant = 'light',
  className = '',
  onClick,
}: BrandLogoProps) {
  // Dimensionnement selon size
  const iconSizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  const titleSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-2xl',
  }[size];

  const logoSrc = '/gspme_logo.jpg';

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className={`relative shrink-0 rounded-xl overflow-hidden shadow-xs bg-white p-0.5 border ${
        variant === 'dark' ? 'border-white/20' : 'border-slate-200/80'
      } ${iconSizeClasses}`}>
        <img
          src={logoSrc}
          alt="GSPME-ERP Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-lg"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center tracking-tight">
            <span
              className={`font-black ${
                variant === 'dark' ? 'text-white' : 'text-[#0F5132]'
              } ${titleSizeClasses}`}
            >
              GSPME
            </span>
            <span
              className={`font-black text-[#D4AF37] ${titleSizeClasses}`}
            >
              -ERP
            </span>
          </div>
          {showTagline && (
            <span
              className={`text-[9px] font-semibold tracking-normal mt-0.5 ${
                variant === 'dark' ? 'text-white/70' : 'text-slate-500'
              }`}
            >
              L'ERP tout-en-un des PME Africaines
            </span>
          )}
        </div>
      )}
    </div>
  );
}
