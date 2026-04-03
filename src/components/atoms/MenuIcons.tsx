import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface IconProps {
  size?: number;
  color?: string;
}

// Om Symbol Icon (using star for spiritual/divine representation)
export const OmIcon = ({ size = 48, color = "currentColor" }: IconProps) => (
  <Ionicons name="star" size={size} color={color} />
);

// Bell Icon
export const BellIcon = ({ size = 48, color = "currentColor" }: IconProps) => (
  <Ionicons name="notifications" size={size} color={color} />
);

// Diya (Oil Lamp) Icon
export const DiyaIcon = ({ size = 48, color = "currentColor" }: IconProps) => (
  <Ionicons name="flame" size={size} color={color} />
);