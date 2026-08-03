'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, History, Car, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const pathname = usePathname();
  const [hasActiveShift, setHasActiveShift] = useState(false);

  useEffect(() => {
    const checkActiveShift = async () => {
      try {
        const res = await fetch('/api/rides?status=open');
        const json = await res.json();
        if (json.success && json.data && json.data.length > 0) {
          setHasActiveShift(true);
        } else {
          setHasActiveShift(false);
        }
      } catch (e) {
        console.error('Erro ao verificar turno ativo no BottomNav:', e);
      }
    };
    
    checkActiveShift();
    
    window.addEventListener('shift-state-changed', checkActiveShift);
    return () => {
      window.removeEventListener('shift-state-changed', checkActiveShift);
    };
  }, [pathname]);

  const navItems = [
    { name: 'Início', href: '/', icon: LayoutDashboard },
    { name: 'Novo', href: '/novo', icon: PlusCircle },
    { name: 'IA', href: 'ai', icon: Sparkles, isAction: true },
    { name: 'Histórico', href: '/historico', icon: History },
    { name: 'Veículo', href: '/veiculo', icon: Car },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container glass">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          if (item.isAction) {
            return (
              <button 
                key={item.href} 
                className="nav-item ai-trigger"
                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-assistant'))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div className="icon-wrapper">
                  <item.icon size={28} className="ai-pulse-icon" />
                </div>
                <span>{item.name}</span>
              </button>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <div className="icon-wrapper">
                <item.icon size={24} />
                {item.href === '/novo' && hasActiveShift && (
                  <span className="active-shift-badge-pulse" />
                )}
                {isActive && (
                  <motion.div
                    layoutId="nav-glow"
                    className="nav-glow"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      </nav>
  );
};

export default BottomNav;
