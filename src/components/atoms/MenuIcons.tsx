import React from 'react';
import { Svg, Path, Circle, Ellipse, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

// Om Symbol Icon
export const OmIcon = ({ size = 48, color = "currentColor" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M24 8C16 8 12 14 12 20C12 26 16 30 24 30C28 30 30 28 30 24" />
    <Path d="M30 24C30 20 28 18 24 18C20 18 18 20 18 24C18 28 20 30 24 30" />
    <Circle cx="24" cy="12" r="2" fill={color} />
    <Path d="M20 32C20 35 21 38 24 40C27 38 28 35 28 32" />
  </Svg>
);

// Bell Icon
export const BellIcon = ({ size = 48, color = "currentColor" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M24 6C18 6 14 10 14 16V24L10 28V32H38V28L34 24V16C34 10 30 6 24 6Z" />
    <Path d="M20 32C20 35 21.5 38 24 40C26.5 38 28 35 28 32" />
    <Circle cx="24" cy="4" r="2" fill={color} />
    <Line x1="20" y1="36" x2="28" y2="36" />
  </Svg>
);

// Diya (Oil Lamp) Icon
export const DiyaIcon = ({ size = 48, color = "currentColor" }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Ellipse cx="24" cy="28" rx="14" ry="6" />
    <Path d="M10 28C10 24 15 20 24 20C33 20 38 24 38 28" />
    <Path d="M24 12C24 12 22 16 22 20C22 22 23 24 24 24C25 24 26 22 26 20C26 16 24 12 24 12Z" fill={color} />
    <Circle cx="24" cy="10" r="2" fill={color} />
  </Svg>
);