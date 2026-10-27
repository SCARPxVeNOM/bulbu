/**
 * BottomNav — floating liquid-glass tab bar.
 * A frosted capsule that rises into a soft hump around a raised jelly-orb "+" button. The active tab sits on a
 * contained cyan jelly bubble that glides between tabs (motion layoutId); inactive tabs are thin muted strokes.
 */
import { NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Icon } from "./Icon";
import { GlossyGlyph } from "./GlossyIcon";
import "./BottomNav.css";

const TABS = [
  { to: "/home", icon: "home", label: "Home" },
  { to: "/goals", icon: "target", label: "Goals" },
  null,
  { to: "/insights", icon: "chart", label: "Insights" },
  { to: "/profile", icon: "user", label: "Profile" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  return (
    <nav className="bnav" aria-label="Main">
      <div className="bnav-bar">
        <svg className="bnav-hump" viewBox="0 0 168 30" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 30 C38 30 44 3 84 3 C124 3 130 30 168 30 Z" />
        </svg>
        <svg className="bnav-contour" viewBox="0 0 400 24" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 14 C60 6 110 20 170 13 S290 6 340 12 S390 16 400 12 L400 24 L0 24 Z" />
        </svg>
        {TABS.map((t, i) => {
          if (!t) return (
            <span key="fab" className="bnav-slot">
              <NavLink to="/log" className="bnav-orb" aria-label="Log an activity">
                <span className="bnav-orb-flow" aria-hidden="true" />
                <span className="bnav-orb-gloss" aria-hidden="true" />
                <Icon name="plus" size={26} stroke={3} />
              </NavLink>
            </span>
          );
          const on = pathname === t.to || pathname.startsWith(t.to + "/");
          return (
            <NavLink key={t.to} to={t.to} className={`bnav-tab ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
              {on && (
                <motion.span layoutId="bnav-bubble" className="bnav-bubble" aria-hidden="true"
                             transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 32 }}>
                  <i className="b1" /><i className="b2" /><i className="b3" />
                </motion.span>
              )}
              <motion.span className="bnav-tab-in" whileTap={reduce ? undefined : { scale: 0.9 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}>
                <span className="bnav-ico"><GlossyGlyph name={t.icon} size={31} active={on} /></span>
                <span className="bnav-label">{t.label}</span>
              </motion.span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
