/** HomeHeader — glossy gel BULBU wordmark + greeting on the left, glass bell and avatar on the right, over liquid-glass waves. */
import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import "./HomeHeader.css";

const Spark = ({ x, y, s, c = "#fff" }: { x: string; y: string; s: number; c?: string }) => (
  <svg className="hh-spark" style={{ left: x, top: y, width: s, height: s }} viewBox="0 0 20 20" aria-hidden="true">
    <path d="M10 0C10.9 6.2 13.8 9.1 20 10C13.8 10.9 10.9 13.8 10 20C9.1 13.8 6.2 10.9 0 10C6.2 9.1 9.1 6.2 10 0Z" fill={c} />
  </svg>
);

export function HomeHeader({ name, greeting, nudges }: { name: string; greeting: string; nudges: number }) {
  return (
    <header className="hh">
      <svg className="hh-waves" viewBox="0 0 400 130" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="hhw1" x1="0" x2="1"><stop offset="0" stopColor="#EAF3FF" stopOpacity=".2" /><stop offset=".55" stopColor="#D9E6FF" stopOpacity=".9" /><stop offset="1" stopColor="#E6E2FF" stopOpacity=".8" /></linearGradient>
          <linearGradient id="hhw2" x1="0" x2="1"><stop offset="0" stopColor="#E4EEFF" stopOpacity=".85" /><stop offset=".5" stopColor="#E9E4FF" stopOpacity=".75" /><stop offset="1" stopColor="#DCE9FF" stopOpacity=".85" /></linearGradient>
          <linearGradient id="hhe1" x1="0" x2="1"><stop offset="0" stopColor="#43D9FF" stopOpacity="0" /><stop offset=".45" stopColor="#43D9FF" stopOpacity=".55" /><stop offset=".8" stopColor="#8059FF" stopOpacity=".35" /><stop offset="1" stopColor="#8059FF" stopOpacity="0" /></linearGradient>
          <radialGradient id="hhb" cx=".35" cy=".3" r=".75"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset=".35" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#CFE0FF" stopOpacity=".15" /></radialGradient>
        </defs>
        <path d="M0 96 C60 84 110 102 170 88 S270 44 330 62 S380 82 400 72 L400 130 L0 130 Z" fill="url(#hhw1)" />
        <path d="M170 88 C230 74 270 44 330 62 S380 82 400 72" fill="none" stroke="url(#hhe1)" strokeWidth="1.6" />
        <path d="M0 108 C80 98 140 116 220 104 S340 84 400 96 L400 130 L0 130 Z" fill="url(#hhw2)" />
        <path d="M120 106 C170 100 200 112 250 103" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="1.2" />
        <circle cx="236" cy="56" r="11" fill="url(#hhb)" stroke="#fff" strokeOpacity=".7" strokeWidth=".8" />
        <circle cx="222" cy="100" r="7" fill="url(#hhb)" stroke="#fff" strokeOpacity=".7" strokeWidth=".7" />
        <circle cx="6" cy="40" r="9" fill="url(#hhb)" stroke="#fff" strokeOpacity=".6" strokeWidth=".7" />
      </svg>
      <Spark x="47%" y="58%" s={9} /><Spark x="69%" y="20%" s={11} /><Spark x="73%" y="56%" s={8} c="#B9B2FF" /><Spark x="88%" y="76%" s={7} c="#B9B2FF" />

      <div className="hh-row">
        <div className="hh-text">
          <GelWordmark />
          <p className="hh-greet">{greeting}, {name} <span aria-hidden="true">👋</span></p>
        </div>
        <div className="hh-actions">
          <Link to="/nudges" className="hh-bell" aria-label={nudges ? `Nudges, ${nudges} new` : "Nudges"}>
            <Icon name="bell" size={22} stroke={2} />
            {nudges > 0 && <span className="hh-badge" />}
          </Link>
          <Link to="/profile" className="hh-avatar" aria-label="Profile"><CartoonAvatar /></Link>
        </div>
      </div>
    </header>
  );
}

/** "BULBU" as glossy 3D gel: cyan → electric blue → violet, bevelled with a specular light, top gloss,
 *  white rim, soft blue-violet shadow, and an orbit swoosh with two tiny glossy spheres and a sparkle. */
export function GelWordmark() {
  return (
    <svg className="hh-word" viewBox="0 0 236 72" role="img" aria-label="Bulbu">
      <defs>
        <linearGradient id="gwFill" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#14C3FF" /><stop offset=".3" stopColor="#2A8CFF" /><stop offset=".56" stopColor="#3550FF" /><stop offset=".8" stopColor="#5E3DFF" /><stop offset="1" stopColor="#7B45FF" />
        </linearGradient>
        <linearGradient id="gwGloss" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".62" /><stop offset=".3" stopColor="#fff" stopOpacity=".14" /><stop offset=".4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gwOrbit" x1="0" x2="1"><stop offset="0" stopColor="#43D9FF" stopOpacity="0" /><stop offset=".25" stopColor="#43D9FF" stopOpacity=".85" /><stop offset=".75" stopColor="#8059FF" stopOpacity=".85" /><stop offset="1" stopColor="#8059FF" stopOpacity="0" /></linearGradient>
        <radialGradient id="gwBlue" cx=".35" cy=".3" r=".7"><stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor="#7FE6FF" /><stop offset="1" stopColor="#2F7BFF" /></radialGradient>
        <radialGradient id="gwViolet" cx=".35" cy=".3" r=".7"><stop offset="0" stopColor="#fff" /><stop offset=".35" stopColor="#B9A4FF" /><stop offset="1" stopColor="#6A45F0" /></radialGradient>
        <filter id="gwBevel" x="-10%" y="-20%" width="120%" height="150%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b" />
          <feSpecularLighting in="b" surfaceScale="5" specularConstant=".8" specularExponent="26" lightingColor="#ffffff" result="s"><fePointLight x="40" y="-80" z="140" /></feSpecularLighting>
          <feComposite in="s" in2="SourceAlpha" operator="in" result="s2" />
          <feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k1="0" k2="1" k3=".32" k4="0" result="lit" />
          <feDropShadow in="lit" dx="0" dy="4" stdDeviation="4" floodColor="#5A4BFF" floodOpacity=".32" />
        </filter>
      </defs>
      {/* back half of the orbit, behind the letters */}
      <path d="M6 44 A112 13 -5 0 1 226 26" fill="none" stroke="url(#gwOrbit)" strokeWidth="1.6" opacity=".55" />
      <g fontFamily="Fredoka, 'Baloo 2', 'Nunito', ui-rounded, system-ui, sans-serif" fontWeight="700" fontSize="56">
        <text x="12" y="56" textLength="190" lengthAdjust="spacingAndGlyphs" fill="url(#gwFill)" filter="url(#gwBevel)">BULBU</text>
        <text x="12" y="56" textLength="190" lengthAdjust="spacingAndGlyphs" fill="url(#gwGloss)">BULBU</text>
        <text x="12" y="56" textLength="190" lengthAdjust="spacingAndGlyphs" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth=".9">BULBU</text>
      </g>
      {/* front half of the orbit, crossing in front of the letters */}
      <path d="M6 44 A112 13 -5 0 0 226 26" fill="none" stroke="url(#gwOrbit)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="222" cy="40" r="4.4" fill="url(#gwBlue)" />
      <circle cx="4" cy="30" r="2.8" fill="url(#gwViolet)" />
      <path d="M214 4c.9 4.6 2.6 6.3 7.2 7.2-4.6.9-6.3 2.6-7.2 7.2-.9-4.6-2.6-6.3-7.2-7.2 4.6-.9 6.3-2.6 7.2-7.2Z" fill="#8059FF" opacity=".85" />
    </svg>
  );
}

/** An original cartoon portrait: dark hair, friendly face, navy hoodie, on warm peach. */
export function CartoonAvatar() {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="avbg" cx=".45" cy=".35" r=".75"><stop offset="0" stopColor="#FFDCC2" /><stop offset="1" stopColor="#FFB98C" /></radialGradient>
        <radialGradient id="avskin" cx=".42" cy=".38" r=".7"><stop offset="0" stopColor="#FFE1C9" /><stop offset="1" stopColor="#F0B892" /></radialGradient>
        <linearGradient id="avhood" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2E3D6E" /><stop offset="1" stopColor="#18213F" /></linearGradient>
        <linearGradient id="avhair" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4A352A" /><stop offset="1" stopColor="#2B1E18" /></linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#avbg)" />
      <path d="M9 64C10.5 52 19 45.5 32 45.5S53.5 52 55 64Z" fill="url(#avhood)" />
      <path d="M22 47.5C25 52 28.5 53.5 32 53.5S39 52 42 47.5C39.5 46.4 36 45.8 32 45.8S24.5 46.4 22 47.5Z" fill="#3A4C86" />
      <path d="M29 52v5M35 52v5" stroke="#E8EDFF" strokeWidth="1.1" strokeLinecap="round" />
      <rect x="28" y="38" width="8" height="9.5" rx="3.5" fill="#E9AE88" />
      <circle cx="20.2" cy="30" r="3.2" fill="#F2BE9A" /><circle cx="43.8" cy="30" r="3.2" fill="#F2BE9A" />
      <ellipse cx="32" cy="28.5" rx="12.2" ry="13.2" fill="url(#avskin)" />
      <path d="M19.4 27.5C18.4 16.5 24.6 11 32.6 11C41.2 11 46.6 16.6 44.8 27.2C43.6 22.6 41.4 20 38.6 18.8C37 21.6 32.4 23.4 27.4 22.2C25.6 23.8 22.4 25.2 19.4 27.5Z" fill="url(#avhair)" />
      <path d="M27 14.6C30.6 12.8 36 13 39.4 15.4" stroke="#6B4E3D" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".7" />
      <path d="M24.6 25.6l3.8-.7M35.6 24.9l3.8.7" stroke="#3A2A22" strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="27" cy="30.2" rx="1.9" ry="2.3" fill="#2A1E1A" /><ellipse cx="37" cy="30.2" rx="1.9" ry="2.3" fill="#2A1E1A" />
      <circle cx="27.6" cy="29.4" r=".7" fill="#fff" /><circle cx="37.6" cy="29.4" r=".7" fill="#fff" />
      <ellipse cx="24" cy="34.2" rx="2.2" ry="1.3" fill="#FF9A9A" opacity=".35" /><ellipse cx="40" cy="34.2" rx="2.2" ry="1.3" fill="#FF9A9A" opacity=".35" />
      <path d="M28.8 35.4Q32 37.8 35.2 35.4" stroke="#B5615A" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
