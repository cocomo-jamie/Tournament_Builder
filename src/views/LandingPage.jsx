import { useState, useRef } from "react";
import {
  Trophy, Users, MapPin, Heart, DollarSign, Calendar, Clock,
  Shield, AlertTriangle, Phone, Mail, Check, ArrowRight, Star,
  Shirt, UtensilsCrossed, CreditCard, Banknote, Send, Award,
  Target, Lock, Globe, Gift, Camera, MessageSquare, ChevronDown,
  Thermometer, Image, HandHelping, Flag, X, AlertCircle
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   CONFIG (from wizard v2 export)
   ═══════════════════════════════════════════════════════════ */
const C = {
  org: { name: "ETRC", fullName: "Ebb Tide Rugby Club", email: "info@etrc.com", phone: "+1 555 123 4567", website: "https://etrc.com" },
  brand: { primary: "#C1121F", secondary: "#1B4D3E", accent: "#D4A843", dark: "#020e4b", light: "#F4F1EA" },
  event: {
    name: "ETRC Annual Bocce Classic",
    sport: "Bocce",
    tagline: "Playing with our balls to prevent elder fraud!",
    date: "2026-08-29",
    dateLabel: "Tournament Day",
    endTime: "18:00",
    venue: "ETRC Clubhouse",
    address: "55 Clubhouse Road",
    courts: 6,
    description: "A fun day of Bocce for teams of all ages and skills! Knockout format with some amazing prizes and attendee gift baskets! All monies after event costs will be donated to charities engaged in the fight against Elder Fraud.",
  },
  cause: {
    name: "Elder Fraud Prevention",
    description: "Several of the Ebb Tide Rugby family have been hit by the scourge of this shameful activity — one member in particular is dealing with the implications of his mother's entire life savings being stolen by scurrilous scammers. We don't want to sit back and ask what can be done — we're rugby players — we're putting our game faces on and doing what we can to raise awareness and funds to push back against the criminals!",
    facts: [
      { title: "The $3.4 Billion Toll", body: "Elder fraud is a massive criminal industry. The FBI reports that seniors lose over $3.4 billion annually, with the average victim losing $30,000 — often wiping out a lifetime of retirement savings in days." },
      { title: "Weaponized AI Voice Cloning", body: "Scammers don't just send clumsy emails anymore. They now use easily accessible AI voice-cloning tech to mimic a grandchild's actual voice, fabricating high-stakes emergencies to bypass a senior's natural defenses." },
      { title: "The Silent Epidemic", body: "Only 1 in 24 cases of elder financial abuse are ever reported. Victims often hide the truth out of intense shame or fear of losing their independence." },
    ],
    closing: "By raising funds and sharing these facts, we bring this issue out of the shadows, break the stigma, and protect our parents and grandparents.",
  },
  fundraising: { goal: 15000, current: 1250, showThermometer: true },
  tournament: { minTeams: 20, maxTeams: 36, playersPerTeam: 2, format: "Double Elimination", pointsToWin: 15, timeLimit: 20 },
  registration: {
    deadline: "2026-08-15", fee: 100, allowDonations: true,
    collectShirtSizes: true, collectDietaryNeeds: true,
    allowTeamLogo: true, allowTeamSlogan: true, sloganMaxWords: 10,
    allowTeamStory: true, storyMaxWords: 300,
    imageConsent: true, imageConsentText: "I consent to photos and videos taken during this event being used for promotional purposes by the organizer.",
    waiverRequired: true, waiverText: "I agree to hold harmless ETRC and it's directors and members from any liability related to my participation in this event.",
  },
  payment: { eTransfer: true, eTransferEmail: "payments@etrc.com", stripe: true, cash: true },
  sponsorTiers: [{ name: "Gold", amount: 2000 }, { name: "Silver", amount: 1000 }, { name: "Bronze", amount: 500 }, { name: "Community", amount: 100 }],
  sponsors: [{ name: "Tall Tree Health", tier: "Gold" }],
  giftBasket: [{ provider: "Christie's Pub", description: "Burger and a beer for $20 (taxes and tip extra)", code: "fightfraudETRC", website: "www.christiespub.com" }],
  volunteers: [
    { title: "Tournament Referee", count: 2 }, { title: "Registration Desk", count: 2 },
    { title: "Parking Attendants", count: 4 }, { title: "Field Judges", count: 8 },
    { title: "Food Staff", count: 6 }, { title: "Bar Staff", count: 2 },
    { title: "Token Purchase Crew", count: 3 }, { title: "Media", count: 2 },
  ],
};

const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const formatDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const generateCode = () => `EF-${Math.floor(100 + Math.random() * 900)}`;

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
:root { --primary: ${C.brand.primary}; --secondary: ${C.brand.secondary}; --accent: ${C.brand.accent}; --dark: ${C.brand.dark}; --light: ${C.brand.light}; }
* { box-sizing: border-box; margin: 0; padding: 0; }
.fd { font-family: 'Playfair Display', Georgia, serif; }
.fb { font-family: 'Inter', system-ui, sans-serif; }
.hero-bg { background: linear-gradient(160deg, ${C.brand.dark} 0%, #041266 30%, ${C.brand.dark} 60%, ${C.brand.primary}12 100%); }
.cause-bg { background: linear-gradient(170deg, ${C.brand.secondary} 0%, #0d3328 100%); }
.angle-cut { clip-path: polygon(0 0, 100% 0, 100% calc(100% - 48px), 0 100%); }
.angle-rev { clip-path: polygon(0 48px, 100% 0, 100% 100%, 0 100%); }
@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px ${C.brand.primary}30; } 50% { box-shadow: 0 0 40px ${C.brand.primary}50; } }
.anim1 { animation: fadeUp .6s ease-out forwards; }
.anim2 { animation: fadeUp .6s ease-out .15s forwards; opacity: 0; }
.anim3 { animation: fadeUp .6s ease-out .3s forwards; opacity: 0; }
.glow { animation: pulse-glow 2s ease-in-out infinite; }
.scroll-mt { scroll-margin-top: 80px; }
input:focus, select:focus, textarea:focus { outline: none; border-color: ${C.brand.accent}88 !important; box-shadow: 0 0 0 3px ${C.brand.accent}22; }
.therm-fill { transition: width 1.5s cubic-bezier(.4,0,.2,1); }
`;

const fs = (s) => ({ fontSize: s });
const fw = (w) => ({ fontWeight: w });
const c = (color) => ({ color });
const bg = (color) => ({ background: color });

/* ═══════════════════════════════════════════════════════════
   NAV
   ═══════════════════════════════════════════════════════════ */
function Nav({ onReg }) {
  const links = [{ l: "The Cause", h: "#cause" }, { l: "Details", h: "#details" }, { l: "Volunteer", h: "#volunteers" }, { l: "Sponsors", h: "#sponsors" }];
  return (
    <nav className="fb" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: `${C.brand.dark}ee`, backdropFilter: "blur(12px)", borderBottom: `1px solid #ffffff12` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.brand.primary}, ${C.brand.primary}cc)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trophy size={18} color="#fff" />
          </div>
          <span className="fd" style={{ fontSize: 16, fontWeight: 800, color: C.brand.light }}>{C.org.name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {links.map(l => <a key={l.h} href={l.h} style={{ fontSize: 13, fontWeight: 600, color: "#ffffff80", textDecoration: "none" }}
            onMouseEnter={e => e.target.style.color = "#fff"} onMouseLeave={e => e.target.style.color = "#ffffff80"}>{l.l}</a>)}
          <button onClick={onReg} style={{ fontSize: 13, fontWeight: 700, color: C.brand.dark, background: C.brand.accent, border: "none", borderRadius: 10, padding: "8px 20px", cursor: "pointer" }}>Register</button>
        </div>
      </div>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════ */
function Hero({ onReg }) {
  const pct = Math.min(100, (C.fundraising.current / C.fundraising.goal) * 100);
  return (
    <section className="hero-bg angle-cut" style={{ paddingTop: 120, paddingBottom: 100, textAlign: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 60, left: "8%", width: 140, height: 140, borderRadius: "50%", background: "#ffffff04", border: "1px solid #ffffff08" }} />
      <div style={{ position: "absolute", bottom: 100, right: "10%", width: 90, height: 90, borderRadius: "50%", background: `${C.brand.primary}08`, border: `1px solid ${C.brand.primary}10` }} />

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px", position: "relative" }}>
        <div className="anim1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.brand.primary}18`, border: `1px solid ${C.brand.primary}35`, borderRadius: 40, padding: "6px 18px", marginBottom: 24 }}>
          <Heart size={14} color={C.brand.primary} />
          <span className="fb" style={{ fontSize: 12, fontWeight: 700, color: C.brand.primary, textTransform: "uppercase", letterSpacing: 1.5 }}>Charity Tournament</span>
        </div>

        <h1 className="fd anim1" style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 900, color: "#fff", lineHeight: 1.05, marginBottom: 16 }}>{C.event.name}</h1>
        <p className="fb anim2" style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: C.brand.accent, fontWeight: 600, fontStyle: "italic", marginBottom: 32 }}>"{C.event.tagline}"</p>

        <div className="fb anim2" style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 32, flexWrap: "wrap" }}>
          {[{ i: Calendar, t: formatDate(C.event.date) }, { i: MapPin, t: C.event.venue }, { i: Users, t: `${C.tournament.maxTeams} Teams · 2v2` }].map((x, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}><x.i size={16} color={C.brand.accent} /><span style={{ fontSize: 14, fontWeight: 500, color: "#ffffffcc" }}>{x.t}</span></div>
          ))}
        </div>

        {/* Fundraising Thermometer */}
        {C.fundraising.showThermometer && (
          <div className="anim3" style={{ maxWidth: 480, margin: "0 auto 36px", background: "#ffffff08", border: "1px solid #ffffff12", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Thermometer size={14} color={C.brand.accent} /><span className="fb" style={{ fontSize: 12, fontWeight: 700, color: C.brand.accent, textTransform: "uppercase", letterSpacing: 1 }}>Fundraising Progress</span></div>
              <span className="fb" style={{ fontSize: 11, color: "#ffffff60" }}>Goal: ${C.fundraising.goal.toLocaleString()}</span>
            </div>
            <div style={{ height: 28, background: "#ffffff10", borderRadius: 14, overflow: "hidden", position: "relative" }}>
              <div className="therm-fill" style={{ height: "100%", borderRadius: 14, background: `linear-gradient(90deg, ${C.brand.secondary}, ${C.brand.accent})`, width: `${pct}%`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 10, minWidth: 50 }}>
                <span className="fb" style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{Math.round(pct)}%</span>
              </div>
            </div>
            <div className="fb" style={{ textAlign: "center", marginTop: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>${C.fundraising.current.toLocaleString()}</span>
              <span style={{ fontSize: 13, color: "#ffffff60", marginLeft: 6 }}>raised so far</span>
            </div>
          </div>
        )}

        <div className="anim3" style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <button onClick={onReg} className="glow" style={{ fontSize: 16, fontWeight: 800, color: "#fff", background: C.brand.primary, border: "none", borderRadius: 14, padding: "16px 40px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
            Register Your Team <ArrowRight size={18} />
          </button>
          <div className="fb" style={{ display: "flex", alignItems: "center", gap: 6, color: C.brand.accent, fontWeight: 700, fontSize: 14 }}><DollarSign size={16} /> $100 per team</div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CAUSE SECTION
   ═══════════════════════════════════════════════════════════ */
function Cause() {
  return (
    <section id="cause" className="scroll-mt cause-bg angle-rev" style={{ padding: "80px 20px 64px", marginTop: -48 }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#ffffff12", borderRadius: 40, padding: "6px 16px", marginBottom: 16 }}>
            <Shield size={14} color={C.brand.accent} />
            <span className="fb" style={{ fontSize: 11, fontWeight: 700, color: C.brand.accent, textTransform: "uppercase", letterSpacing: 2 }}>Why We Play</span>
          </div>
          <h2 className="fd" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#fff", marginBottom: 16 }}>{C.cause.name}</h2>
          <p className="fb" style={{ fontSize: 15, lineHeight: 1.75, color: "#ffffffcc", maxWidth: 720, margin: "0 auto" }}>{C.cause.description}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
          {C.cause.facts.map((f, i) => (
            <div key={i} style={{ background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 16, padding: 24, transition: "transform .3s" }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.brand.primary}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={16} color={C.brand.primary} />
                </div>
                <h3 className="fd" style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{f.title}</h3>
              </div>
              <p className="fb" style={{ fontSize: 13, lineHeight: 1.65, color: "#ffffffaa" }}>{f.body}</p>
            </div>
          ))}
        </div>
        <p className="fb" style={{ textAlign: "center", fontSize: 15, fontWeight: 600, color: C.brand.accent, fontStyle: "italic", maxWidth: 600, margin: "0 auto" }}>{C.cause.closing}</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   EVENT DETAILS
   ═══════════════════════════════════════════════════════════ */
function Details() {
  const items = [
    { icon: Calendar, label: "Date", value: formatDate(C.event.date) },
    { icon: Clock, label: "Time", value: `Until ${C.event.endTime}` },
    { icon: MapPin, label: "Venue", value: `${C.event.venue}\n${C.event.address}` },
    { icon: Target, label: "Courts", value: `${C.event.courts} courts running simultaneously` },
    { icon: Users, label: "Teams", value: `2 players per team · ${C.tournament.format}` },
    { icon: Trophy, label: "Scoring", value: `First to ${C.tournament.pointsToWin} pts · ${C.tournament.timeLimit} min cap` },
  ];
  return (
    <section id="details" className="scroll-mt" style={{ background: C.brand.dark, padding: "80px 20px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="fd" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#fff" }}>Event Details</h2>
          <div style={{ width: 60, height: 3, background: C.brand.accent, margin: "16px auto 0", borderRadius: 2 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 40 }}>
          {items.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: 20, background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.brand.secondary}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <d.icon size={18} color={C.brand.secondary} />
              </div>
              <div>
                <p className="fb" style={{ fontSize: 11, fontWeight: 700, color: "#ffffff50", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{d.label}</p>
                <p className="fb" style={{ fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "pre-line", lineHeight: 1.5 }}>{d.value}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: `${C.brand.secondary}10`, border: `1px solid ${C.brand.secondary}25`, borderRadius: 16, padding: 28 }}>
          <h3 className="fd" style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 12 }}>What to Expect</h3>
          <p className="fb" style={{ fontSize: 14, lineHeight: 1.7, color: "#ffffffaa" }}>{C.event.description}</p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   GIFT BASKET TEASER
   ═══════════════════════════════════════════════════════════ */
function GiftBasket() {
  if (!C.giftBasket.length) return null;
  return (
    <section style={{ background: "#010b3e", borderTop: "1px solid #ffffff08", padding: "56px 20px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.brand.accent}15`, borderRadius: 40, padding: "6px 16px", marginBottom: 16 }}>
          <Gift size={14} color={C.brand.accent} />
          <span className="fb" style={{ fontSize: 11, fontWeight: 700, color: C.brand.accent, textTransform: "uppercase", letterSpacing: 2 }}>Attendee Perks</span>
        </div>
        <h2 className="fd" style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Digital Gift Basket</h2>
        <p className="fb" style={{ fontSize: 14, color: "#ffffff70", marginBottom: 28 }}>Every participant gets exclusive deals from our community partners.</p>
        <div style={{ display: "grid", gap: 12 }}>
          {C.giftBasket.map((g, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, background: "#ffffff06", border: "1px solid #ffffff10", borderRadius: 14, padding: "16px 20px", textAlign: "left" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${C.brand.accent}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Gift size={18} color={C.brand.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="fb" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{g.provider}</p>
                <p className="fb" style={{ fontSize: 13, color: "#ffffff80" }}>{g.description}</p>
              </div>
              {g.code && <span className="fb" style={{ fontSize: 11, fontWeight: 700, background: `${C.brand.accent}20`, color: C.brand.accent, padding: "4px 10px", borderRadius: 8, whiteSpace: "nowrap" }}>{g.code}</span>}
            </div>
          ))}
        </div>
        <p className="fb" style={{ fontSize: 12, color: "#ffffff40", marginTop: 16 }}>Full gift basket shared with all registered teams before event day.</p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPONSORS
   ═══════════════════════════════════════════════════════════ */
function Sponsors() {
  return (
    <section id="sponsors" className="scroll-mt" style={{ background: "#010a38", borderTop: "1px solid #ffffff08", padding: "72px 20px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
        <h2 className="fd" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#fff", marginBottom: 8 }}>Our Sponsors</h2>
        <p className="fb" style={{ fontSize: 14, color: "#ffffff50", marginBottom: 40 }}>
          Interested in sponsoring? <a href={`mailto:${C.org.email}`} style={{ color: C.brand.accent, textDecoration: "none" }}>{C.org.email}</a>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
          {C.sponsorTiers.map((tier, i) => {
            const sponsor = C.sponsors.find(s => s.tier === tier.name);
            return (
              <div key={i} style={{ padding: 28, borderRadius: 16, border: `1px solid ${i === 0 ? C.brand.accent + "40" : "#ffffff12"}`, background: i === 0 ? `${C.brand.accent}08` : "#ffffff04" }}>
                <Star size={20} color={i === 0 ? C.brand.accent : "#ffffff30"} style={{ marginBottom: 12 }} />
                <p className="fd" style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? C.brand.accent : "#fff", marginBottom: 4 }}>{tier.name}</p>
                <p className="fb" style={{ fontSize: 13, color: "#ffffff50" }}>${tier.amount.toLocaleString()}</p>
                {sponsor ? (
                  <p className="fb" style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginTop: 16, background: "#ffffff08", borderRadius: 8, padding: "8px 12px" }}>{sponsor.name}</p>
                ) : (
                  <p className="fb" style={{ fontSize: 12, color: "#ffffff30", marginTop: 16, fontStyle: "italic" }}>Spots available</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   REGISTRATION FORM — STYLES & HELPERS (hoisted for perf)
   ═══════════════════════════════════════════════════════════ */
const INP = { width: "100%", padding: "12px 14px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, color: "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif" };
const INP_SM = { ...INP, padding: "10px 12px", fontSize: 13 };
const SEL = { ...INP, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff50' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };
const SEL_SM = { ...SEL, padding: "10px 12px", fontSize: 13 };
const LBL = { display: "block", fontSize: 11, fontWeight: 700, color: "#ffffff60", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 };
const LBL_SM = { ...LBL, fontSize: 10 };

function FormCard({ icon: Icon, title, sub, children }) {
  return (
    <div style={{ background: "#ffffff04", border: "1px solid #ffffff10", borderRadius: 18, padding: 28, marginBottom: 20 }}>
      <h3 className="fb" style={{ fontSize: 13, fontWeight: 700, color: C.brand.accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: sub ? 4 : 20, display: "flex", alignItems: "center", gap: 8 }}><Icon size={14} /> {title}</h3>
      {sub && <p className="fb" style={{ fontSize: 12, color: "#ffffff50", marginBottom: 20 }}>{sub}</p>}
      {children}
    </div>
  );
}

function countWords(s) { return s.trim() ? s.trim().split(/\s+/).length : 0; }

function RegistrationForm({ formRef }) {
  const [state, setState] = useState("form");
  const [reconCode] = useState(generateCode());

  const [t, setT] = useState({
    teamName: "", slogan: "", story: "",
    captainName: "", captainEmail: "", captainPhone: "", captainShirt: "",
    p1Name: "", p1Shirt: "", p1Diet: "",
    p2Name: "", p2Shirt: "", p2Diet: "",
    paymentMethod: "e_transfer", donation: 0,
    imageConsent: false, waiverAccepted: false,
  });

  const u = (k, v) => setT(p => ({ ...p, [k]: v }));
  const total = C.registration.fee + (t.donation || 0);
  const storyWords = countWords(t.story);
  const sloganWords = countWords(t.slogan);
  const storyOver = storyWords > C.registration.storyMaxWords;
  const sloganOver = sloganWords > C.registration.sloganMaxWords;

  const valid = t.teamName && t.captainName && t.captainEmail && t.captainPhone && t.p1Name
    && (!C.registration.imageConsent || t.imageConsent) && (!C.registration.waiverRequired || t.waiverAccepted)
    && !storyOver && !sloganOver;

  if (state === "success") {
    const isPending = t.paymentMethod !== "stripe"; // Stripe auto-confirms; e-transfer and cash are manual
    return (
      <section ref={formRef} id="register" className="scroll-mt" style={{ background: C.brand.dark, padding: "80px 20px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: isPending ? `${C.brand.accent}20` : `${C.brand.secondary}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
            {isPending ? <Clock size={36} color={C.brand.accent} /> : <Check size={36} color={C.brand.secondary} />}
          </div>
          <h2 className="fd" style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 12 }}>
            {isPending ? "Registration Submitted!" : "You're In!"}
          </h2>
          <p className="fb" style={{ fontSize: 15, color: "#ffffffaa", marginBottom: 12, lineHeight: 1.6 }}>
            <strong style={{ color: "#fff" }}>{t.teamName}</strong> — details received. A summary has been sent to <strong style={{ color: C.brand.accent }}>{t.captainEmail}</strong>.
          </p>
          {isPending && (
            <div style={{ background: `${C.brand.accent}10`, border: `1px solid ${C.brand.accent}25`, borderRadius: 12, padding: "12px 16px", marginBottom: 28, display: "inline-flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={16} color={C.brand.accent} />
              <p className="fb" style={{ fontSize: 13, fontWeight: 600, color: C.brand.accent }}>
                Your spot is reserved but <strong>not confirmed</strong> until payment is received.
              </p>
            </div>
          )}

          {t.paymentMethod === "e_transfer" && (
            <div style={{ background: "#ffffff06", border: `1px solid ${C.brand.accent}30`, borderRadius: 16, padding: 28, textAlign: "left", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><Send size={18} color={C.brand.accent} /><h4 className="fb" style={{ fontSize: 15, fontWeight: 800, color: C.brand.accent }}>Next Step: Send Your e-Transfer</h4></div>
              <p className="fb" style={{ fontSize: 12, color: "#ffffff50", marginBottom: 16 }}>Our treasurer will manually confirm your entry once the memo code matches your transaction.</p>
              <div style={{ background: "#ffffff04", border: "1px solid #ffffff10", borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 13, color: "#ffffffcc", lineHeight: 2 }}>
                <div><span style={{ color: "#ffffff50" }}>Recipient:</span> {C.payment.eTransferEmail}</div>
                <div><span style={{ color: "#ffffff50" }}>Amount:</span> ${total.toFixed(2)}</div>
                <div style={{ color: C.brand.accent, fontWeight: 700 }}><span style={{ color: "#ffffff50" }}>Required Memo:</span> {reconCode}</div>
              </div>
              <p className="fb" style={{ fontSize: 12, color: "#ffffff60", marginTop: 14, lineHeight: 1.5 }}>
                Once we receive and match your e-Transfer, you'll get a confirmation email and your status will update to <strong style={{ color: C.brand.secondary }}>Confirmed</strong>.
              </p>
            </div>
          )}

          {t.paymentMethod === "cash" && (
            <div style={{ background: "#ffffff06", border: `1px solid ${C.brand.accent}30`, borderRadius: 16, padding: 28, textAlign: "left", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><Banknote size={18} color={C.brand.accent} /><h4 className="fb" style={{ fontSize: 15, fontWeight: 800, color: C.brand.accent }}>Next Step: Pay at Check-In</h4></div>
              <p className="fb" style={{ fontSize: 13, color: "#ffffffaa", lineHeight: 1.6 }}>
                Bring <strong style={{ color: "#fff" }}>${total.toFixed(2)}</strong> to the registration desk on game day. Quote your code: <strong style={{ color: C.brand.accent }}>{reconCode}</strong>
              </p>
              <p className="fb" style={{ fontSize: 12, color: "#ffffff50", marginTop: 12 }}>Your registration will be confirmed once payment is received at check-in.</p>
            </div>
          )}

          {t.paymentMethod === "stripe" && (
            <div style={{ background: "#ffffff06", border: `1px solid ${C.brand.secondary}30`, borderRadius: 16, padding: 24, textAlign: "left", marginBottom: 24 }}>
              <p className="fb" style={{ fontSize: 14, color: "#ffffffaa" }}><CreditCard size={16} style={{ display: "inline", verticalAlign: -3, marginRight: 8 }} color={C.brand.secondary} />Payment of <strong style={{ color: "#fff" }}>${total.toFixed(2)}</strong> processed. Your team is confirmed!</p>
            </div>
          )}

          <button onClick={() => setState("form")} className="fb" style={{ marginTop: 24, fontSize: 14, fontWeight: 600, color: C.brand.accent, background: "none", border: `1px solid ${C.brand.accent}40`, borderRadius: 10, padding: "10px 24px", cursor: "pointer" }}>Register Another Team</button>
        </div>
      </section>
    );
  }

  return (
    <section ref={formRef} id="register" className="scroll-mt" style={{ background: C.brand.dark, padding: "80px 20px", borderTop: "1px solid #ffffff08" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 className="fd" style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "#fff" }}>Register Your Team</h2>
          <p className="fb" style={{ fontSize: 14, color: "#ffffff60", marginTop: 8 }}>Deadline: <strong style={{ color: C.brand.accent }}>{formatDate(C.registration.deadline)}</strong> · ${C.registration.fee}/team</p>
        </div>

        {/* Team Identity */}
        <FormCard icon={Trophy} title="Team Identity">
          <div style={{ marginBottom: 16 }}><label style={LBL}>Team Name *</label><input style={INP} value={t.teamName} onChange={e => u("teamName", e.target.value)} placeholder="The Pallino Pushers" /></div>
          {C.registration.allowTeamSlogan && (
            <div style={{ marginBottom: 16 }}>
              <label style={LBL}>Team Slogan <span style={{ fontWeight: 400, textTransform: "none" }}>({C.registration.sloganMaxWords} words max)</span></label>
              <input style={sloganOver ? { ...INP, borderColor: C.brand.primary } : INP} value={t.slogan} onChange={e => u("slogan", e.target.value)} placeholder="Born to throw, here to win" />
              {sloganOver && <p className="fb" style={{ fontSize: 11, color: C.brand.primary, marginTop: 4 }}>{sloganWords}/{C.registration.sloganMaxWords} words — please shorten</p>}
            </div>
          )}
          {C.registration.allowTeamLogo && (
            <div>
              <label style={LBL}><Image size={10} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} /> Team Logo (optional)</label>
              <div style={{ ...INP, display: "flex", alignItems: "center", gap: 10, color: "#ffffff40", cursor: "pointer" }}>
                <Image size={16} /><span style={{ fontSize: 13 }}>Upload JPG or PNG (max 2MB)</span>
              </div>
            </div>
          )}
        </FormCard>

        {/* Team Story */}
        {C.registration.allowTeamStory && (
          <FormCard icon={MessageSquare} title="Share Your Story" sub="Why is your team participating? Displayed on our Teams bulletin board.">
            <textarea style={storyOver ? { ...INP, resize: "none", borderColor: C.brand.primary } : { ...INP, resize: "none" }} rows={4} value={t.story} onChange={e => u("story", e.target.value)} placeholder="Tell us why your team is joining the fight against elder fraud..." />
            <p className="fb" style={{ fontSize: 11, color: storyOver ? C.brand.primary : storyWords > C.registration.storyMaxWords * 0.9 ? C.brand.accent : "#ffffff40", marginTop: 6, textAlign: "right" }}>
              {storyWords}/{C.registration.storyMaxWords} words{storyOver ? " — please shorten" : ""}
            </p>
          </FormCard>
        )}

        {/* Captain (= Player 1) */}
        <FormCard icon={Shield} title="Team Captain (Player 1)" sub="The captain enters scores on game day via mobile login. Captain counts as Player 1.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1/-1" }}><label style={LBL}>Full Name *</label><input style={INP} value={t.captainName} onChange={e => u("captainName", e.target.value)} placeholder="Jane Smith" /></div>
            <div><label style={LBL}>Email *</label><input style={INP} type="email" value={t.captainEmail} onChange={e => u("captainEmail", e.target.value)} placeholder="jane@email.com" /></div>
            <div><label style={LBL}>Phone *</label><input style={INP} type="tel" value={t.captainPhone} onChange={e => u("captainPhone", e.target.value)} placeholder="+1 250-555-0100" /></div>
          </div>
          {C.registration.collectShirtSizes && (
            <div style={{ marginTop: 12 }}><label style={LBL}><Shirt size={10} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} /> Shirt Size</label>
              <select style={SEL} value={t.captainShirt} onChange={e => u("captainShirt", e.target.value)}><option value="">Select</option>{SHIRT_SIZES.map(s => <option key={s}>{s}</option>)}</select></div>
          )}
          {C.registration.collectDietaryNeeds && (
            <div style={{ marginTop: 12 }}><label style={LBL}><UtensilsCrossed size={10} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} /> Dietary Needs</label>
              <input style={INP} value={t.captainDiet || ""} onChange={e => u("captainDiet", e.target.value)} placeholder="Allergies, vegetarian, etc." /></div>
          )}
        </FormCard>

        {/* Additional Players (captain is player 1, so we need playersPerTeam - 1 more) */}
        {C.tournament.playersPerTeam > 1 && (
          <FormCard icon={Users} title={`Player 2${C.tournament.playersPerTeam > 2 ? ` – ${C.tournament.playersPerTeam}` : ""}`} sub={`${C.tournament.playersPerTeam - 1} additional player${C.tournament.playersPerTeam > 2 ? "s" : ""} needed (captain is Player 1)`}>
            {Array.from({ length: C.tournament.playersPerTeam - 1 }, (_, i) => i + 1).map(n => (
              <div key={n} style={{ padding: 16, background: "#ffffff04", borderRadius: 12, border: "1px solid #ffffff08", marginBottom: n < C.tournament.playersPerTeam - 1 ? 12 : 0 }}>
                <p className="fb" style={{ fontSize: 12, fontWeight: 700, color: "#ffffff50", marginBottom: 10 }}>Player {n + 1}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ gridColumn: "1/-1" }}><label style={LBL_SM}>Name *</label><input style={INP_SM} value={t[`p${n}Name`]} onChange={e => u(`p${n}Name`, e.target.value)} placeholder={`Player ${n + 1} name`} /></div>
                  <div><label style={LBL_SM}>Email *</label><input style={INP_SM} type="email" value={t[`p${n}Email`] || ""} onChange={e => u(`p${n}Email`, e.target.value)} placeholder="player@email.com" /></div>
                  <div><label style={LBL_SM}>Phone</label><input style={INP_SM} type="tel" value={t[`p${n}Phone`] || ""} onChange={e => u(`p${n}Phone`, e.target.value)} placeholder="+1 250-555-0100" /></div>
                </div>
                {C.registration.collectShirtSizes && (
                  <div style={{ marginTop: 8 }}><label style={LBL_SM}><Shirt size={9} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} /> Shirt Size</label>
                    <select style={SEL_SM} value={t[`p${n}Shirt`] || ""} onChange={e => u(`p${n}Shirt`, e.target.value)}><option value="">Size</option>{SHIRT_SIZES.map(s => <option key={s}>{s}</option>)}</select></div>
                )}
                {C.registration.collectDietaryNeeds && (
                  <div style={{ marginTop: 8 }}><label style={LBL_SM}><UtensilsCrossed size={9} style={{ display: "inline", verticalAlign: -1, marginRight: 4 }} /> Dietary Needs</label>
                    <input style={INP_SM} value={t[`p${n}Diet`] || ""} onChange={e => u(`p${n}Diet`, e.target.value)} placeholder="Allergies, vegetarian..." /></div>
                )}
              </div>
            ))}
          </FormCard>
        )}

        {/* Payment */}
        <FormCard icon={DollarSign} title="Payment">
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            {[{ v: "e_transfer", l: "e-Transfer", i: Send, ok: C.payment.eTransfer }, { v: "stripe", l: "Credit Card", i: CreditCard, ok: C.payment.stripe }, { v: "cash", l: "Cash at Door", i: Banknote, ok: C.payment.cash }]
              .filter(p => p.ok).map(p => (
                <button key={p.v} type="button" onClick={() => u("paymentMethod", p.v)} style={{
                  flex: 1, minWidth: 120, padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  border: `2px solid ${t.paymentMethod === p.v ? C.brand.accent : "#ffffff15"}`,
                  background: t.paymentMethod === p.v ? `${C.brand.accent}10` : "#ffffff04",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <p.i size={16} color={t.paymentMethod === p.v ? C.brand.accent : "#ffffff50"} />
                  <span className="fb" style={{ fontSize: 13, fontWeight: 600, color: t.paymentMethod === p.v ? C.brand.accent : "#ffffff80" }}>{p.l}</span>
                </button>
              ))}
          </div>

          {C.registration.allowDonations && (
            <div style={{ marginBottom: 16 }}>
              <label style={LBL}>Additional Donation (optional)</label>
              <div style={{ position: "relative" }}><span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#ffffff50", fontSize: 14 }}>$</span>
                <input type="number" min="0" step="5" style={{ ...INP, paddingLeft: 28 }} value={t.donation || ""} onChange={e => u("donation", parseInt(e.target.value) || 0)} placeholder="0" /></div>
            </div>
          )}

          <div style={{ background: "#ffffff04", borderRadius: 10, padding: 16, border: "1px solid #ffffff08" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="fb" style={{ fontSize: 13, color: "#ffffff60" }}>Entry Fee</span><span className="fb" style={{ fontSize: 13, color: "#ffffffcc" }}>${C.registration.fee.toFixed(2)}</span></div>
            {t.donation > 0 && <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><span className="fb" style={{ fontSize: 13, color: "#ffffff60" }}>Donation</span><span className="fb" style={{ fontSize: 13, color: C.brand.secondary }}>${t.donation.toFixed(2)}</span></div>}
            <div style={{ borderTop: "1px solid #ffffff10", paddingTop: 8, display: "flex", justifyContent: "space-between" }}><span className="fb" style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Total</span><span className="fb" style={{ fontSize: 18, fontWeight: 800, color: C.brand.accent }}>${total.toFixed(2)}</span></div>
          </div>
        </FormCard>

        {/* Consent & Waiver */}
        <FormCard icon={Lock} title="Consent & Waiver">
          {C.registration.imageConsent && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 20 }}>
              <button type="button" onClick={() => u("imageConsent", !t.imageConsent)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${t.imageConsent ? C.brand.secondary : "#ffffff25"}`, background: t.imageConsent ? C.brand.secondary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 2 }}>
                {t.imageConsent && <Check size={14} color="#fff" />}
              </button>
              <div>
                <span className="fb" style={{ fontSize: 13, color: "#ffffffcc", display: "flex", alignItems: "center", gap: 6 }}><Camera size={12} /> Image & Video Consent</span>
                <p className="fb" style={{ fontSize: 12, color: "#ffffff50", marginTop: 4 }}>{C.registration.imageConsentText}</p>
              </div>
            </label>
          )}
          {C.registration.waiverRequired && (
            <>
              <p className="fb" style={{ fontSize: 13, color: "#ffffffaa", lineHeight: 1.6, background: "#ffffff04", padding: 16, borderRadius: 10, border: "1px solid #ffffff08", marginBottom: 12 }}>{C.registration.waiverText}</p>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <button type="button" onClick={() => u("waiverAccepted", !t.waiverAccepted)} style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${t.waiverAccepted ? C.brand.secondary : "#ffffff25"}`, background: t.waiverAccepted ? C.brand.secondary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {t.waiverAccepted && <Check size={14} color="#fff" />}
                </button>
                <span className="fb" style={{ fontSize: 13, color: "#ffffffaa" }}>I agree to the liability waiver</span>
              </label>
            </>
          )}
        </Card>

        {/* Submit */}
        <button type="button" disabled={!valid} onClick={() => setState("success")} style={{
          width: "100%", padding: "16px 24px", borderRadius: 14, border: "none", cursor: valid ? "pointer" : "default",
          background: valid ? C.brand.primary : "#ffffff15", color: valid ? "#fff" : "#ffffff30",
          fontSize: 16, fontWeight: 800, fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <Award size={18} /> Submit Registration
        </button>
        <p className="fb" style={{ textAlign: "center", fontSize: 12, color: "#ffffff30", marginTop: 16 }}>Reconciliation code: <strong style={{ color: C.brand.accent }}>{reconCode}</strong></p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   VOLUNTEER SIGNUP FORM (hoisted styles)
   ═══════════════════════════════════════════════════════════ */
const V_INP = { width: "100%", padding: "12px 14px", background: "#ffffff08", border: "1px solid #ffffff15", borderRadius: 10, color: "#fff", fontSize: 14, fontFamily: "'Inter',sans-serif" };
const V_LBL = { display: "block", fontSize: 11, fontWeight: 700, color: "#ffffff60", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 };

function Volunteers() {
  const totalNeeded = C.volunteers.reduce((s, r) => s + r.count, 0);
  const [showForm, setShowForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", role: "", otherRoles: [], experience: "", certifications: "" });

  const uv = (k, val) => setV(p => ({ ...p, [k]: val }));

  const openForm = (role) => {
    setSelectedRole(role);
    setV(p => ({ ...p, role }));
    setShowForm(true);
    setSubmitted(false);
  };

  const toggleOther = (role) => {
    setV(p => ({
      ...p,
      otherRoles: p.otherRoles.includes(role) ? p.otherRoles.filter(r => r !== role) : [...p.otherRoles, role],
    }));
  };

  const validVol = v.firstName && v.lastName && v.email && v.role;

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setSubmitted(false);
    setSelectedRole("");
    setV({ firstName: "", lastName: "", email: "", phone: "", role: "", otherRoles: [], experience: "", certifications: "" });
  };

  return (
    <section id="volunteers" className="scroll-mt" style={{ background: "#010b3e", borderTop: "1px solid #ffffff08", padding: "64px 20px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 className="fd" style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Want to Help?</h2>
          <p className="fb" style={{ fontSize: 14, color: "#ffffff60" }}>We need <strong style={{ color: C.brand.accent }}>{totalNeeded} volunteers</strong> to make this day amazing. Click a role to sign up.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 20 }}>
          {C.volunteers.map((vol, i) => (
            <button key={i} type="button" onClick={() => openForm(vol.title)} style={{
              background: selectedRole === vol.title && showForm ? `${C.brand.accent}15` : "#ffffff06",
              border: `1px solid ${selectedRole === vol.title && showForm ? C.brand.accent + "40" : "#ffffff10"}`,
              borderRadius: 12, padding: "14px 12px", cursor: "pointer", textAlign: "center", transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${C.brand.accent}10`; e.currentTarget.style.borderColor = `${C.brand.accent}30`; }}
              onMouseLeave={e => { if (selectedRole !== vol.title || !showForm) { e.currentTarget.style.background = "#ffffff06"; e.currentTarget.style.borderColor = "#ffffff10"; } }}
            >
              <p className="fb" style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{vol.title}</p>
              <p className="fb" style={{ fontSize: 12, color: C.brand.accent }}>{vol.count} needed</p>
              <p className="fb" style={{ fontSize: 10, color: "#ffffff40", marginTop: 4 }}>Click to apply</p>
            </button>
          ))}
        </div>

        {/* Volunteer Signup Form */}
        {showForm && !submitted && (
          <div style={{ background: "#ffffff04", border: "1px solid #ffffff10", borderRadius: 18, padding: 28, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="fb" style={{ fontSize: 15, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <HandHelping size={16} color={C.brand.accent} /> Volunteer Sign-Up
              </h3>
              <button type="button" onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} color="#ffffff50" /></button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label style={V_LBL}>First Name *</label><input style={V_INP} value={v.firstName} onChange={e => uv("firstName", e.target.value)} placeholder="Jane" /></div>
              <div><label style={V_LBL}>Last Name *</label><input style={V_INP} value={v.lastName} onChange={e => uv("lastName", e.target.value)} placeholder="Smith" /></div>
              <div><label style={V_LBL}>Email *</label><input style={V_INP} type="email" value={v.email} onChange={e => uv("email", e.target.value)} placeholder="jane@email.com" /></div>
              <div><label style={V_LBL}>Phone</label><input style={V_INP} type="tel" value={v.phone} onChange={e => uv("phone", e.target.value)} placeholder="+1 250-555-0100" /></div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={V_LBL}>Primary Role *</label>
              <div style={{ position: "relative" }}>
                <select value={v.role} onChange={e => uv("role", e.target.value)} style={{ ...V_INP, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ffffff50' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}>
                  <option value="">Select a role...</option>
                  {C.volunteers.map((vol, i) => <option key={i} value={vol.title}>{vol.title} ({vol.count} needed)</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={V_LBL}>Also willing to help with</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {C.volunteers.filter(vol => vol.title !== v.role).map((vol, i) => (
                  <button key={i} type="button" onClick={() => toggleOther(vol.title)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${v.otherRoles.includes(vol.title) ? C.brand.accent + "50" : "#ffffff15"}`,
                    background: v.otherRoles.includes(vol.title) ? `${C.brand.accent}15` : "transparent",
                    color: v.otherRoles.includes(vol.title) ? C.brand.accent : "#ffffff60",
                    fontFamily: "'Inter',sans-serif", transition: "all 0.15s",
                  }}>
                    {v.otherRoles.includes(vol.title) && <span style={{ marginRight: 4 }}>✓</span>}
                    {vol.title}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={V_LBL}>Relevant Experience</label>
              <textarea style={{ ...V_INP, resize: "none" }} rows={3} value={v.experience} onChange={e => uv("experience", e.target.value)} placeholder="Any relevant experience, past events volunteered at, skills..." />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={V_LBL}>Certifications</label>
              <input style={V_INP} value={v.certifications} onChange={e => uv("certifications", e.target.value)} placeholder="First Aid, Food Safe, Serving It Right, etc." />
            </div>

            <button type="button" disabled={!validVol} onClick={handleSubmit} style={{
              width: "100%", padding: "14px 24px", borderRadius: 12, border: "none", cursor: validVol ? "pointer" : "default",
              background: validVol ? C.brand.secondary : "#ffffff15", color: validVol ? "#fff" : "#ffffff30",
              fontSize: 15, fontWeight: 800, fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <HandHelping size={16} /> Submit Volunteer Application
            </button>
          </div>
        )}

        {/* Volunteer Submitted */}
        {showForm && submitted && (
          <div style={{ background: "#ffffff04", border: `1px solid ${C.brand.secondary}30`, borderRadius: 18, padding: 28, marginTop: 8, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${C.brand.secondary}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Check size={28} color={C.brand.secondary} />
            </div>
            <h3 className="fd" style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 8 }}>Thank You, {v.firstName}!</h3>
            <p className="fb" style={{ fontSize: 14, color: "#ffffffaa", lineHeight: 1.6, marginBottom: 6 }}>
              Your application for <strong style={{ color: C.brand.accent }}>{v.role}</strong> has been submitted.
              {v.otherRoles.length > 0 && <> You've also offered to help with <strong style={{ color: C.brand.accent }}>{v.otherRoles.join(", ")}</strong>.</>}
            </p>
            <p className="fb" style={{ fontSize: 13, color: "#ffffff60", marginBottom: 20 }}>
              We'll be in touch at <strong style={{ color: "#fff" }}>{v.email}</strong> with your volunteer package closer to event day.
            </p>
            <button type="button" onClick={resetForm} className="fb" style={{ fontSize: 13, fontWeight: 600, color: C.brand.accent, background: "none", border: `1px solid ${C.brand.accent}40`, borderRadius: 10, padding: "8px 20px", cursor: "pointer" }}>Done</button>
          </div>
        )}

        {!showForm && (
          <p className="fb" style={{ textAlign: "center", fontSize: 13, color: "#ffffff50", marginTop: 12 }}>Or contact <a href={`mailto:${C.org.email}`} style={{ color: C.brand.accent, textDecoration: "none" }}>{C.org.email}</a> directly</p>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ background: "#000820", borderTop: "1px solid #ffffff08", padding: "40px 20px", textAlign: "center" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${C.brand.primary}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Trophy size={16} color={C.brand.primary} /></div>
        <p className="fd" style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 8 }}>{C.event.name}</p>
        <p className="fb" style={{ fontSize: 13, color: "#ffffff50", marginBottom: 16 }}>Organized by {C.org.name} · {formatDate(C.event.date)}</p>
        <div className="fb" style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12 }}>
          <a href={`mailto:${C.org.email}`} style={{ color: "#ffffff50", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}><Mail size={12} /> Email</a>
          <a href={`tel:${C.org.phone}`} style={{ color: "#ffffff50", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}><Phone size={12} /> Phone</a>
          <a href={C.org.website} target="_blank" rel="noopener" style={{ color: "#ffffff50", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}><Globe size={12} /> Website</a>
        </div>
        <p className="fb" style={{ fontSize: 11, color: "#ffffff20", marginTop: 24 }}>All proceeds support {C.cause.name}</p>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const formRef = useRef(null);
  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="fb" style={{ background: C.brand.dark, minHeight: "100vh", color: "#fff" }}>
      <style>{CSS}</style>
      <Nav onReg={scrollToForm} />
      <Hero onReg={scrollToForm} />
      <Cause />
      <Details />
      <RegistrationForm formRef={formRef} />
      <GiftBasket />
      <Volunteers />
      <Sponsors />
      <Footer />
    </div>
  );
}
