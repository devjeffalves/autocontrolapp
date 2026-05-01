'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, History, Car } from 'lucide-react';
import { motion } from 'framer-motion';

const BottomNav = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Início', href: '/', icon: LayoutDashboard },
    { name: 'Novo', href: '/novo', icon: PlusCircle },
    { name: 'Histórico', href: '/historico', icon: History },
    { name: 'Veículo', href: '/veiculo', icon: Car },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-container glass">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <div className="icon-wrapper">
                <item.icon size={24} />
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
