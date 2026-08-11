import React from 'react';
import { Sidebar } from './Sidebar';

interface NavbarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  onOpenM365Hub?: () => void;
  onSyncAllM365?: () => void;
  onLockSession?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = (props) => {
  return <Sidebar {...props} />;
};

export { Sidebar };
