import { useState, useRef } from "react";
import {
  Trophy, Users, MapPin, Heart, DollarSign, Megaphone,
  ChevronRight, ChevronLeft, Check, Copy, Download,
  Plus, X, Palette, Globe, Mail, Phone, Calendar, Clock,
  Shield, Award, Zap, ArrowRight, Info, ChevronDown,
  Star, Hash, CreditCard, Building2, AlertCircle,
  Image, FileText, Tent, Thermometer, Camera, MessageSquare,
  Map, Package, HandHelping, Hotel, Car, Gift, Bot,
  ClipboardList, Shirt, UtensilsCrossed, Wrench, Target,
  Flag, Megaphone as Horn, BookOpen, Printer, Send,
  CircleDot, LayoutGrid, UserPlus, Banknote
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function ColorSwatch({ color, onChange, label }) {
  const ref = useRef(null);
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <button type="button" onClick={() => ref.current?.click()}
        className="w-10 h-10 rounded-lg border-2 border-white/20 shadow-inner transition-transform group-hover:scale-110"
        style={{ backgroundColor: color }} />
      <input ref={ref} type="color" value={color} onChange={e => onChange(e.target.value)} className="sr-only" />
      <span className="text-sm text-stone-400 group-hover:text-stone-200 transition-colors">{label}</span>
    </label>
  );
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-stone-900/80 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all">
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={typeof o === "string" ? o : o.value} value={typeof o === "string" ? o : o.value}>
            {typeof o === "string" ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", icon: Icon, prefix, ...rest }) {
  return (
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />}
      {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-medium text-sm">{prefix}</span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-stone-900/80 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all ${Icon ? "pl-10" : ""} ${prefix ? "pl-8" : ""}`}
        {...rest} />
    </div>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-stone-900/80 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/60 transition-all resize-none" />
  );
}

function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`mt-0.5 relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? "bg-amber-500" : "bg-stone-700"}`}>
        <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform absolute top-1 ${checked ? "left-6" : "left-1"}`} />
      </button>
      <div>
        <span className="text-sm text-stone-200 group-hover:text-white transition-colors">{label}</span>
        {sublabel && <p className="text-xs text-stone-500 mt-0.5">{sublabel}</p>}
      </div>
    </label>
  );
}

function Field({ label, hint, children, required }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-stone-300">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      {children}
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="bg-stone-800/50 rounded-xl p-4 border border-stone-700/50 flex gap-3">
      <Info size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-stone-400">{children}</p>
    </div>
  );
}

function ChecklistManager({ items, onChange, addLabel = "Add item" }) {
  const toggle = (i) => {
    const next = [...items];
    next[i] = { ...next[i], checked: !next[i].checked };
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const add = () => onChange([...items, { label: "", checked: false, custom: true }]);
  const rename = (i, v) => {
    const next = [...items];
    next[i] = { ...next[i], label: v };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2.5 group">
          <button type="button" onClick={() => toggle(i)}
            className={`w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all ${item.checked ? "bg-amber-500 border-amber-500" : "border-stone-600 hover:border-stone-400"}`}>
            {item.checked && <Check size={12} className="text-stone-950" />}
          </button>
          {item.custom ? (
            <input value={item.label} onChange={e => rename(i, e.target.value)} placeholder="Custom item..."
              className="flex-1 bg-transparent text-sm text-stone-200 border-b border-stone-700 pb-0.5 focus:outline-none focus:border-amber-500/50 placeholder:text-stone-600" />
          ) : (
            <span className={`flex-1 text-sm ${item.checked ? "text-stone-200" : "text-stone-500"}`}>{item.label}</span>
          )}
          <button type="button" onClick={() => remove(i)} className="text-stone-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors mt-1">
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

function ListManager({ items, onChange, fields, addLabel = "Add" }) {
  const add = () => {
    const blank = {};
    fields.forEach(f => { blank[f.key] = f.default || ""; });
    onChange([...items, blank]);
  };
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const edit = (i, key, val) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3 bg-stone-900/50 border border-stone-700 rounded-xl p-3">
          <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: fields.length > 2 ? "1fr 1fr" : "1fr" }}>
            {fields.map(f => (
              <div key={f.key} className={f.wide ? "col-span-full" : ""}>
                {f.type === "select" ? (
                  <select value={item[f.key]} onChange={e => edit(i, f.key, e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm focus:outline-none">
                    {f.placeholder && <option value="">{f.placeholder}</option>}
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea value={item[f.key]} onChange={e => edit(i, f.key, e.target.value)} placeholder={f.placeholder}
                    rows={2} className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm focus:outline-none resize-none" />
                ) : (
                  <input value={item[f.key]} onChange={e => edit(i, f.key, e.target.value)} placeholder={f.placeholder} type={f.type || "text"}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm focus:outline-none" />
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => remove(i)} className="text-stone-600 hover:text-red-400 transition-colors mt-2"><X size={16} /></button>
        </div>
      ))}
      <button type="button" onClick={add} className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors">
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPORT-SPECIFIC DATA
   ═══════════════════════════════════════════════════════════ */

const SPORTS = [
  { value: "bocce", label: "Bocce" }, { value: "soccer", label: "Soccer / Football" },
  { value: "rugby", label: "Rugby" }, { value: "bowling", label: "Bowling" },
  { value: "volleyball", label: "Volleyball" }, { value: "softball", label: "Softball / Baseball" },
  { value: "cornhole", label: "Cornhole" }, { value: "dodgeball", label: "Dodgeball" },
  { value: "kickball", label: "Kickball" }, { value: "golf", label: "Golf" },
  { value: "tennis", label: "Tennis" }, { value: "pickleball", label: "Pickleball" },
  { value: "basketball", label: "Basketball" }, { value: "hockey", label: "Hockey" },
  { value: "curling", label: "Curling" }, { value: "darts", label: "Darts" },
  { value: "other", label: "Other" },
];

const FORMATS = [
  { value: "round_robin", label: "Round Robin" }, { value: "single_elim", label: "Single Elimination" },
  { value: "double_elim", label: "Double Elimination" }, { value: "pool_playoff", label: "Pool Play → Playoffs" },
  { value: "swiss", label: "Swiss System" },
];

const VENUE_LABELS = {
  bocce: "Courts", soccer: "Pitches", rugby: "Pitches", bowling: "Lanes",
  volleyball: "Courts", softball: "Diamonds", cornhole: "Boards", dodgeball: "Courts",
  kickball: "Diamonds", golf: "Holes", tennis: "Courts", pickleball: "Courts",
  basketball: "Courts", hockey: "Rinks", curling: "Sheets", darts: "Boards", other: "Playing Areas",
};

const EQUIPMENT_BY_SPORT = {
  bocce: ["Bocce ball sets", "Pallino (jack ball)", "Measuring tape / calipers", "Portable scoreboards", "Boundary markers / string", "Court rakes"],
  soccer: ["Soccer balls (match)", "Soccer balls (warmup)", "Goals / nets", "Corner flags", "Cones / markers", "Pinnies / bibs", "Whistles", "Field paint / chalk", "Ball pump & needles"],
  rugby: ["Rugby balls (match)", "Rugby balls (warmup)", "Cones / markers", "Tackle shields", "Whistles", "Kicking tees", "First aid kit", "Mouth guard spares", "Flag / tag belts (if tag)"],
  bowling: ["Lane reservations confirmed", "Scoring system active", "Spare house balls available", "Shoe rental arranged"],
  volleyball: ["Volleyballs", "Nets & poles", "Antenna markers", "Boundary lines / tape", "Whistles", "Ball pump"],
  softball: ["Bats (various sizes)", "Softballs", "Bases / base anchors", "Helmets", "Gloves (spares)", "Backstop / fencing", "Chalk / field liner"],
  cornhole: ["Cornhole boards", "Bean bag sets (8 per board)", "Scoreboards", "Measuring tape"],
  dodgeball: ["Dodgeballs", "Boundary cones", "Whistles", "Pinnies / bibs", "First aid kit"],
  tennis: ["Tennis balls (new cans)", "Nets & straps", "Scorecards", "Ball hoppers"],
  pickleball: ["Pickleballs (outdoor/indoor)", "Spare paddles", "Nets (portable)", "Court tape", "Scorecards"],
  basketball: ["Basketballs", "Hoops / nets checked", "Scoreboard", "Whistles", "Pinnies / bibs"],
  hockey: ["Pucks / balls", "Goals / nets", "Whistles", "Pinnies / bibs", "First aid kit"],
  curling: ["Stones (sets)", "Brooms / brushes", "Slider shoes available", "Scoreboard"],
  darts: ["Dartboards", "Dart sets (house)", "Scoreboards / chalk", "Oche markers", "Lighting"],
  golf: ["Scorecards & pencils", "Tees", "Flags / pins", "Ball markers", "Cart reservations"],
  kickball: ["Kickballs", "Bases", "Cones / markers", "Whistles"],
  other: ["Sport-specific balls/equipment", "Goals / targets / nets", "Boundary markers", "Scoreboards", "Whistles"],
};

const VENUE_FACILITIES = [
  { label: "Indoor space (clubhouse / hall)", checked: false },
  { label: "Outdoor covered area (tent / pavilion)", checked: false },
  { label: "Permanent washrooms", checked: false },
  { label: "Portable toilets needed", checked: false },
  { label: "BBQ / cooking area", checked: false },
  { label: "Bar / drink service area", checked: false },
  { label: "Food trucks / vendors", checked: false },
  { label: "Water stations", checked: false },
  { label: "First aid station", checked: false },
  { label: "AED on site", checked: false },
  { label: "Changing rooms / facilities", checked: false },
  { label: "Parking area", checked: false },
  { label: "Overflow parking plan", checked: false },
  { label: "Accessibility (wheelchair, ramps)", checked: false },
  { label: "PA / sound system", checked: false },
  { label: "TV / projector for live display", checked: false },
  { label: "Wi-Fi available", checked: false },
];

const SIGNAGE_ITEMS = [
  { label: "Tall hi-viz field/court name signs", checked: false },
  { label: "Directional signs (parking, entry)", checked: false },
  { label: "Washroom / toilet directional signs", checked: false },
  { label: "First aid / medical station signs", checked: false },
  { label: "Registration / check-in desk sign", checked: false },
  { label: "Food & drink area signs", checked: false },
  { label: "Sponsor banners / signage", checked: false },
  { label: "Event welcome banner", checked: false },
  { label: "Schedule / bracket display board", checked: false },
  { label: "Emergency exit / assembly point signs", checked: false },
];

const PERMITS_LICENSES = [
  { label: "Field / court booking confirmation", checked: false },
  { label: "Facility / venue booking confirmation", checked: false },
  { label: "Food handling permit", checked: false },
  { label: "Alcohol license / liquor permit", checked: false },
  { label: "Special event permit (municipal)", checked: false },
  { label: "Noise / amplified sound permit", checked: false },
  { label: "Liability insurance certificate", checked: false },
  { label: "First aid coverage confirmation", checked: false },
  { label: "Parking authorization", checked: false },
];

const STAFF_ROLES = [
  "Event Director", "Tournament Admin", "Tournament Referee", "Head Judge",
  "Registration Lead", "Finance / Treasurer", "Volunteer Coordinator",
  "Food & Beverage Manager", "Safety / First Aid Lead", "MC / Announcer",
  "Media / Photographer", "Facilities Manager", "Sponsorship Lead",
];

/* ═══════════════════════════════════════════════════════════
   STEPS CONFIG
   ═══════════════════════════════════════════════════════════ */

const STEPS = [
  { id: "org", label: "Organization", icon: Building2, desc: "Your club identity, branding, and assets." },
  { id: "event", label: "Event", icon: Trophy, desc: "Dates, venue, and event details." },
  { id: "venue", label: "Venue & Equipment", icon: Tent, desc: "Facilities checklist and sport equipment." },
  { id: "cause", label: "Cause & Fundraising", icon: Heart, desc: "Charity details and fundraising goals." },
  { id: "format", label: "Tournament", icon: Zap, desc: "Teams, format, and scoring rules." },
  { id: "reg", label: "Registration", icon: Users, desc: "What to collect from teams signing up." },
  { id: "fees", label: "Fees & Payment", icon: DollarSign, desc: "Entry fees and payment processing." },
  { id: "sponsors", label: "Sponsors & Services", icon: Megaphone, desc: "Sponsors, local services, and gift baskets." },
  { id: "volunteers", label: "Volunteers & Staff", icon: HandHelping, desc: "Roles, packages, and management." },
  { id: "deliverables", label: "Deliverables", icon: Package, desc: "Artifacts and outputs to generate." },
  { id: "review", label: "Review", icon: Check, desc: "Export your tournament configuration." },
];

/* ═══════════════════════════════════════════════════════════
   DEFAULT STATE
   ═══════════════════════════════════════════════════════════ */

const initialState = {
  // ── Organization ──
  orgName: "", orgEmail: "", orgPhone: "", orgWebsite: "",
  primaryColor: "#C1121F", secondaryColor: "#1B4D3E", accentColor: "#D4A843", bgColor: "#121212", bgLight: "#F4F1EA",
  orgLogoUrl: "", orgStyleRef: "",
  orgImages: [], // [{url, caption}]

  // ── Event ──
  eventName: "", sport: "", sportOther: "", eventTagline: "", eventDescription: "",
  eventDays: 1,
  eventDates: [{ date: "", label: "Day 1" }],
  eventEndTime: "",
  venueName: "", venueAddress: "", venueCount: 4,

  // ── Venue & Equipment ──
  equipment: [],
  facilities: JSON.parse(JSON.stringify(VENUE_FACILITIES)),
  signage: JSON.parse(JSON.stringify(SIGNAGE_ITEMS)),
  permits: JSON.parse(JSON.stringify(PERMITS_LICENSES)),
  fieldLayoutNotes: "",

  // ── Cause & Fundraising ──
  isCharity: true, causeName: "", causeDescription: "", causeEducation: "",
  charityLogoUrl: "",
  fundraisingGoal: 0,
  fundraisingCurrent: 0,
  showThermometer: true,

  // ── Tournament ──
  minTeams: 8, maxTeams: 24, playersPerTeam: 4, playersMin: 3, playersMax: 6,
  requireCaptain: true, requireCoach: false,
  format: "pool_playoff", poolCount: 4, teamsPerPool: 4,
  pointsToWin: 11, maxPoints: 15, timeLimit: 0, allowTies: false,

  // ── Registration ──
  regDeadline: "",
  collectShirtSizes: false, collectDietaryNeeds: false,
  allowTeamLogo: true, allowTeamSlogan: true, sloganMaxWords: 10,
  allowTeamStory: true, storyMaxWords: 300,
  imageConsent: true, imageConsentText: "I consent to photos and videos taken during this event being used for promotional purposes by the organizer.",
  waiverRequired: false, waiverText: "",

  // ── Fees ──
  entryFee: 100, allowDonations: true,
  paymentMethods: ["e_transfer"], eTransferEmail: "",
  stripeEnabled: false, cashEnabled: true, autoReconciliation: true,

  // ── Sponsors & Services ──
  sponsorTiers: [{ name: "Gold", amount: 500 }, { name: "Silver", amount: 250 }, { name: "Bronze", amount: 100 }],
  sponsors: [], // [{name, tier, logoUrl, website}]
  localServices: [], // [{name, type, phone, address, notes}]
  giftBasket: [], // [{provider, description, discountCode, website}]

  // ── Volunteers ──
  volunteerRoles: [
    { title: "Tournament Referee", count: 2, description: "Officiate matches, resolve disputes" },
    { title: "Registration Desk", count: 2, description: "Check in teams, verify payment" },
  ],
  staffContacts: [], // [{name, role, phone, email}]

  // ── Deliverables ──
  generateSchedule: true,
  generateRunSheet: true,
  generateSiteMaps: true,
  generateResourceDir: true,
  generateVolunteerPkg: true,
  generateStaffPkg: true,
  generateServicePkg: true,
  enableAIAssistant: true,
  enableGiftBasket: true,
};

/* ═══════════════════════════════════════════════════════════
   MAIN WIZARD COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function TournamentBuilderWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialState);
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const update = (field, value) => setData(prev => ({ ...prev, [field]: value }));
  const venueLabel = VENUE_LABELS[data.sport] || "Playing Areas";

  // Auto-populate equipment when sport changes
  const setSport = (sport) => {
    update("sport", sport);
    const list = (EQUIPMENT_BY_SPORT[sport] || EQUIPMENT_BY_SPORT.other).map(label => ({ label, checked: false, custom: false }));
    update("equipment", list);
  };

  // Sync event dates when day count changes
  const setDays = (n) => {
    const num = Math.max(1, Math.min(14, parseInt(n) || 1));
    update("eventDays", num);
    const dates = Array.from({ length: num }, (_, i) => data.eventDates[i] || { date: "", label: `Day ${i + 1}` });
    update("eventDates", dates.slice(0, num));
  };

  const updateDate = (i, field, val) => {
    const next = [...data.eventDates];
    next[i] = { ...next[i], [field]: val };
    update("eventDates", next);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return data.orgName.trim() && data.orgEmail.trim();
      case 1: return data.eventName.trim() && data.sport && data.eventDates[0]?.date && data.venueName.trim();
      default: return true;
    }
  };

  const next = () => { if (canProceed() && step < STEPS.length - 1) setStep(step + 1); };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const exportConfig = () => JSON.stringify(data, null, 2);
  const copyConfig = () => {
    navigator.clipboard.writeText(exportConfig());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ─── STEP 0: Organization ─── */
  const renderOrg = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Organization Name" required><Input value={data.orgName} onChange={v => update("orgName", v)} placeholder="Ebb Tide Rugby Club" icon={Building2} /></Field>
        <Field label="Contact Email" required><Input value={data.orgEmail} onChange={v => update("orgEmail", v)} placeholder="info@yourclub.com" type="email" icon={Mail} /></Field>
        <Field label="Contact Phone"><Input value={data.orgPhone} onChange={v => update("orgPhone", v)} placeholder="+1 250-555-0100" icon={Phone} /></Field>
        <Field label="Website"><Input value={data.orgWebsite} onChange={v => update("orgWebsite", v)} placeholder="https://yourclub.com" icon={Globe} /></Field>
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Palette size={14} /> Brand Colors</h3>
        <p className="text-xs text-stone-500 mb-4">These style your tournament site. Match your club's identity.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <ColorSwatch color={data.primaryColor} onChange={v => update("primaryColor", v)} label="Primary" />
          <ColorSwatch color={data.secondaryColor} onChange={v => update("secondaryColor", v)} label="Secondary" />
          <ColorSwatch color={data.accentColor} onChange={v => update("accentColor", v)} label="Accent" />
          <ColorSwatch color={data.bgColor} onChange={v => update("bgColor", v)} label="Dark BG" />
          <ColorSwatch color={data.bgLight} onChange={v => update("bgLight", v)} label="Light BG" />
        </div>
        <div className="mt-5 rounded-xl overflow-hidden border border-stone-700">
          <div className="h-3 flex">
            <div className="flex-1" style={{ backgroundColor: data.primaryColor }} />
            <div className="flex-1" style={{ backgroundColor: data.secondaryColor }} />
            <div className="flex-1" style={{ backgroundColor: data.accentColor }} />
          </div>
          <div className="p-4 flex items-center justify-between" style={{ backgroundColor: data.bgColor }}>
            <span className="text-sm font-bold" style={{ color: data.bgLight }}>{data.orgName || "Your Club"}</span>
            <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: data.primaryColor, color: "#fff" }}>Preview</span>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Image size={14} /> Logos & Images</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Organization Logo URL" hint="Direct link to your logo (PNG/JPG). Can also upload after setup.">
            <Input value={data.orgLogoUrl} onChange={v => update("orgLogoUrl", v)} placeholder="https://yourclub.com/logo.png" icon={Image} />
          </Field>
          <Field label="Style Reference URL" hint="Link to your website for design cues (fonts, layout)">
            <Input value={data.orgStyleRef} onChange={v => update("orgStyleRef", v)} placeholder="https://yourclub.com" icon={Globe} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Background / Hero Images" hint="URLs to images for website backgrounds. Add via admin panel later too.">
            <ListManager items={data.orgImages} onChange={v => update("orgImages", v)}
              fields={[{ key: "url", placeholder: "Image URL (https://...)", wide: true }, { key: "caption", placeholder: "Caption / usage note" }]}
              addLabel="Add Image" />
          </Field>
        </div>
      </div>
    </div>
  );

  /* ─── STEP 1: Event ─── */
  const renderEvent = () => (
    <div className="space-y-6">
      <Field label="Event / Tournament Name" required>
        <Input value={data.eventName} onChange={v => update("eventName", v)} placeholder="Annual Charity Bocce Classic" icon={Trophy} />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Sport" required>
          <Select value={data.sport} onChange={v => setSport(v)} options={SPORTS} placeholder="Select a sport..." />
        </Field>
        {data.sport === "other" && (
          <Field label="Specify Sport" required><Input value={data.sportOther} onChange={v => update("sportOther", v)} placeholder="e.g., Axe Throwing" /></Field>
        )}
      </div>

      <Field label="Event Tagline" hint="Punchy one-liner for your landing page hero">
        <Input value={data.eventTagline} onChange={v => update("eventTagline", v)} placeholder="Throw. Score. Change Lives." />
      </Field>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar size={14} /> Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <Field label="Number of Days" required hint="How many days will the event span?">
            <Input value={data.eventDays} onChange={v => setDays(v)} type="number" min="1" max="14" icon={Hash} />
          </Field>
          <Field label="End Time (final day)">
            <Input value={data.eventEndTime} onChange={v => update("eventEndTime", v)} type="time" icon={Clock} />
          </Field>
        </div>

        <div className="space-y-3">
          {data.eventDates.map((d, i) => (
            <div key={i} className="grid grid-cols-2 gap-3 bg-stone-900/50 border border-stone-700 rounded-xl p-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Day {i + 1} Date *</label>
                <input type="date" value={d.date} onChange={e => updateDate(i, "date", e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">Label</label>
                <input value={d.label} onChange={e => updateDate(i, "label", e.target.value)} placeholder={`Day ${i + 1}`}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-stone-200 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><MapPin size={14} /> Venue</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Venue Name" required><Input value={data.venueName} onChange={v => update("venueName", v)} placeholder="Windsor Park Clubhouse" icon={MapPin} /></Field>
          <Field label="Venue Address"><Input value={data.venueAddress} onChange={v => update("venueAddress", v)} placeholder="2451 Windsor Rd, Victoria BC" /></Field>
        </div>
        <div className="mt-4">
          <Field label={`Number of ${venueLabel}`} hint={`Simultaneous ${venueLabel.toLowerCase()} on game day`}>
            <Input value={data.venueCount} onChange={v => update("venueCount", parseInt(v) || 0)} type="number" min="1" max="50" icon={Hash} />
          </Field>
        </div>
      </div>

      <Field label="Event Description" hint="Shown on the landing page below the hero">
        <Textarea value={data.eventDescription} onChange={v => update("eventDescription", v)} placeholder="Describe what attendees can expect..." rows={4} />
      </Field>
    </div>
  );

  /* ─── STEP 2: Venue & Equipment ─── */
  const renderVenue = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2"><Wrench size={14} /> Equipment Checklist</h3>
        <p className="text-xs text-stone-500 mb-4">Auto-populated for {SPORTS.find(s => s.value === data.sport)?.label || "your sport"}. Check what you have, add what's missing.</p>
        {data.equipment.length > 0 ? (
          <ChecklistManager items={data.equipment} onChange={v => update("equipment", v)} addLabel="Add equipment" />
        ) : (
          <p className="text-sm text-stone-600 italic">Select a sport on the Event step to auto-populate equipment.</p>
        )}
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2"><Tent size={14} /> Venue Facilities</h3>
        <p className="text-xs text-stone-500 mb-4">Check available facilities. Add custom items for your venue.</p>
        <ChecklistManager items={data.facilities} onChange={v => update("facilities", v)} addLabel="Add facility" />
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2"><Flag size={14} /> Signage</h3>
        <p className="text-xs text-stone-500 mb-4">What signs and markers need to be prepared?</p>
        <ChecklistManager items={data.signage} onChange={v => update("signage", v)} addLabel="Add sign" />
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2"><FileText size={14} /> Permits & Licenses</h3>
        <p className="text-xs text-stone-500 mb-4">Track required permits and bookings. Check off what's secured, add any others.</p>
        <ChecklistManager items={data.permits} onChange={v => update("permits", v)} addLabel="Add permit / license" />
      </div>

      <div className="border-t border-stone-800 pt-6">
        <Field label="Field / Court Layout Notes" hint="Describe the layout or reference a file to upload via admin. This generates your site maps.">
          <Textarea value={data.fieldLayoutNotes} onChange={v => update("fieldLayoutNotes", v)}
            placeholder="E.g., Courts 1-4 on main lawn (north side), Courts 5-6 behind clubhouse. Parking along east fence..." rows={3} />
        </Field>
        <Tip>Upload detailed field layout images (JPG, PNG, PPT) through the Admin panel after setup. These will be shared with team captains.</Tip>
      </div>
    </div>
  );

  /* ─── STEP 3: Cause & Fundraising ─── */
  const renderCause = () => (
    <div className="space-y-6">
      <Toggle checked={data.isCharity} onChange={v => update("isCharity", v)} label="This is a charity or fundraising event" sublabel="Enable cause sections and fundraising tracker" />

      {data.isCharity && (
        <div className="space-y-5 pt-2">
          <Field label="Cause / Charity Name" required><Input value={data.causeName} onChange={v => update("causeName", v)} placeholder="Elder Fraud Prevention" icon={Heart} /></Field>
          <Field label="Charity Logo URL" hint="Direct link to the charity's logo for use on the site">
            <Input value={data.charityLogoUrl} onChange={v => update("charityLogoUrl", v)} placeholder="https://charity.org/logo.png" icon={Image} />
          </Field>
          <Field label="Cause Description"><Textarea value={data.causeDescription} onChange={v => update("causeDescription", v)} placeholder="Why this cause matters..." rows={4} /></Field>
          <Field label="Educational / Awareness Content" hint="Facts, tips, or resources displayed on the site"><Textarea value={data.causeEducation} onChange={v => update("causeEducation", v)} placeholder="Key facts, prevention tips..." rows={4} /></Field>

          <div className="border-t border-stone-800 pt-6">
            <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Thermometer size={14} /> Fundraising Tracker</h3>
            <Toggle checked={data.showThermometer} onChange={v => update("showThermometer", v)} label="Show fundraising thermometer on site" sublabel="A visual progress bar toward your goal" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
              <Field label="Fundraising Goal ($)"><Input value={data.fundraisingGoal} onChange={v => update("fundraisingGoal", parseFloat(v) || 0)} type="number" min="0" prefix="$" /></Field>
              <Field label="Raised to Date ($)" hint="Update anytime from admin"><Input value={data.fundraisingCurrent} onChange={v => update("fundraisingCurrent", parseFloat(v) || 0)} type="number" min="0" prefix="$" /></Field>
            </div>

            {data.showThermometer && data.fundraisingGoal > 0 && (
              <div className="mt-4 bg-stone-900/60 border border-stone-700 rounded-xl p-4">
                <div className="flex justify-between text-xs text-stone-500 mb-2">
                  <span>${data.fundraisingCurrent.toLocaleString()} raised</span>
                  <span>Goal: ${data.fundraisingGoal.toLocaleString()}</span>
                </div>
                <div className="h-6 bg-stone-800 rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(100, (data.fundraisingCurrent / data.fundraisingGoal) * 100)}%`, background: `linear-gradient(90deg, ${data.secondaryColor}, ${data.accentColor})` }}>
                    {data.fundraisingCurrent / data.fundraisingGoal > 0.15 && (
                      <span className="text-[10px] font-bold text-white">{Math.round((data.fundraisingCurrent / data.fundraisingGoal) * 100)}%</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /* ─── STEP 4: Tournament Format ─── */
  const renderFormat = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Minimum Teams" required><Input value={data.minTeams} onChange={v => update("minTeams", parseInt(v) || 0)} type="number" min="2" /></Field>
        <Field label="Maximum Teams" required><Input value={data.maxTeams} onChange={v => update("maxTeams", parseInt(v) || 0)} type="number" min="2" /></Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Field label="Players Per Team"><Input value={data.playersPerTeam} onChange={v => update("playersPerTeam", parseInt(v) || 0)} type="number" min="1" /></Field>
        <Field label="Minimum Players"><Input value={data.playersMin} onChange={v => update("playersMin", parseInt(v) || 0)} type="number" min="1" /></Field>
        <Field label="Maximum Players"><Input value={data.playersMax} onChange={v => update("playersMax", parseInt(v) || 0)} type="number" min="1" /></Field>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Toggle checked={data.requireCaptain} onChange={v => update("requireCaptain", v)} label="Require Team Captain" sublabel="Captain handles scoring on game day" />
        <Toggle checked={data.requireCoach} onChange={v => update("requireCoach", v)} label="Require Team Coach" sublabel="Separate coach/manager contact" />
      </div>
      <div className="border-t border-stone-800 pt-6">
        <Field label="Tournament Format" required>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
            {FORMATS.map(f => (
              <button key={f.value} type="button" onClick={() => update("format", f.value)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${data.format === f.value ? "border-amber-500 bg-amber-500/10 text-amber-200" : "border-stone-700 bg-stone-900/50 text-stone-400 hover:border-stone-600"}`}>
                <span className="text-sm font-semibold">{f.label}</span>
              </button>
            ))}
          </div>
        </Field>
      </div>
      {(data.format === "pool_playoff" || data.format === "round_robin") && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Number of Pools"><Input value={data.poolCount} onChange={v => update("poolCount", parseInt(v) || 0)} type="number" min="2" /></Field>
          <Field label="Teams Per Pool"><Input value={data.teamsPerPool} onChange={v => update("teamsPerPool", parseInt(v) || 0)} type="number" min="2" /></Field>
        </div>
      )}
      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4">Scoring Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Points to Win"><Input value={data.pointsToWin} onChange={v => update("pointsToWin", parseInt(v) || 0)} type="number" min="1" /></Field>
          <Field label="Max Points (Cap)" hint="0 = no cap"><Input value={data.maxPoints} onChange={v => update("maxPoints", parseInt(v) || 0)} type="number" min="0" /></Field>
          <Field label="Time Limit (min)" hint="0 = no limit"><Input value={data.timeLimit} onChange={v => update("timeLimit", parseInt(v) || 0)} type="number" min="0" /></Field>
        </div>
      </div>
    </div>
  );

  /* ─── STEP 5: Registration ─── */
  const renderReg = () => (
    <div className="space-y-6">
      <Field label="Registration Deadline"><Input value={data.regDeadline} onChange={v => update("regDeadline", v)} type="date" icon={Calendar} /></Field>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4">Player Data Collection</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Toggle checked={data.collectShirtSizes} onChange={v => update("collectShirtSizes", v)} label="Shirt Sizes" />
          <Toggle checked={data.collectDietaryNeeds} onChange={v => update("collectDietaryNeeds", v)} label="Dietary Needs" />
        </div>
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Star size={14} /> Team Identity</h3>
        <div className="space-y-4">
          <Toggle checked={data.allowTeamLogo} onChange={v => update("allowTeamLogo", v)} label="Allow Team Logo Upload" sublabel="Teams can upload a logo (JPG/PNG) during registration" />
          <Toggle checked={data.allowTeamSlogan} onChange={v => update("allowTeamSlogan", v)} label="Allow Team Slogan" sublabel={`Short team motto, max ${data.sloganMaxWords} words`} />
          {data.allowTeamSlogan && (
            <div className="ml-14"><Field label="Max Slogan Words"><Input value={data.sloganMaxWords} onChange={v => update("sloganMaxWords", parseInt(v) || 10)} type="number" min="3" max="20" /></Field></div>
          )}
        </div>
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><MessageSquare size={14} /> Team Stories</h3>
        <Toggle checked={data.allowTeamStory} onChange={v => update("allowTeamStory", v)}
          label='"Share Your Story" on registration'
          sublabel="Teams write why they're participating + optional image. Displayed on a bulletin board page." />
        {data.allowTeamStory && (
          <div className="ml-14 mt-3"><Field label="Max Story Words"><Input value={data.storyMaxWords} onChange={v => update("storyMaxWords", parseInt(v) || 300)} type="number" min="50" max="1000" /></Field></div>
        )}
        <Tip>Stories appear on a "Meet the Teams" bulletin board page, building community engagement and emotional connection to the cause.</Tip>
      </div>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Camera size={14} /> Consent & Waivers</h3>
        <div className="space-y-4">
          <Toggle checked={data.imageConsent} onChange={v => update("imageConsent", v)} label="Require Image Use Consent" sublabel="Permission for event photos/videos to be published" />
          {data.imageConsent && (
            <div className="ml-14"><Field label="Consent Text"><Textarea value={data.imageConsentText} onChange={v => update("imageConsentText", v)} rows={2} /></Field></div>
          )}
          <Toggle checked={data.waiverRequired} onChange={v => update("waiverRequired", v)} label="Require Liability Waiver" />
          {data.waiverRequired && (
            <div className="ml-14"><Field label="Waiver Text"><Textarea value={data.waiverText} onChange={v => update("waiverText", v)} placeholder="By registering, I acknowledge..." rows={3} /></Field></div>
          )}
        </div>
      </div>
    </div>
  );

  /* ─── STEP 6: Fees & Payment ─── */
  const renderFees = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Entry Fee Per Team" required><Input value={data.entryFee} onChange={v => update("entryFee", parseFloat(v) || 0)} type="number" min="0" step="5" prefix="$" /></Field>
        <div className="flex items-end pb-1"><Toggle checked={data.allowDonations} onChange={v => update("allowDonations", v)} label="Accept Donations" sublabel="Teams add a donation during registration" /></div>
      </div>
      <div className="border-t border-stone-800 pt-6 space-y-4">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2">Payment Methods</h3>
        {[
          { key: "e_transfer", field: "paymentMethods", label: "Interac e-Transfer", sublabel: "Auto-reconciliation with unique memo codes", icon: Send },
          { key: "cash", field: "cashEnabled", label: "Cash / In-Person", sublabel: "Admin marks paid at check-in", icon: Banknote },
          { key: "stripe", field: "stripeEnabled", label: "Stripe Online Payments", sublabel: "Credit/debit cards online", icon: CreditCard },
        ].map(p => (
          <div key={p.key} className={`rounded-xl p-4 border-2 transition-all ${
            (p.field === "paymentMethods" ? data.paymentMethods.includes(p.key) : data[p.field])
              ? "border-amber-500/50 bg-amber-500/5" : "border-stone-700 bg-stone-900/50"}`}>
            <Toggle
              checked={p.field === "paymentMethods" ? data.paymentMethods.includes(p.key) : data[p.field]}
              onChange={v => {
                if (p.field === "paymentMethods") {
                  update("paymentMethods", v ? [...data.paymentMethods, p.key] : data.paymentMethods.filter(m => m !== p.key));
                } else {
                  update(p.field, v);
                }
              }}
              label={p.label} sublabel={p.sublabel} />
            {p.key === "e_transfer" && data.paymentMethods.includes("e_transfer") && (
              <div className="mt-3 ml-14"><Field label="e-Transfer Recipient Email"><Input value={data.eTransferEmail} onChange={v => update("eTransferEmail", v)} placeholder="payments@yourclub.com" type="email" icon={Mail} /></Field></div>
            )}
            {p.key === "stripe" && data.stripeEnabled && (
              <div className="mt-3 ml-14 bg-stone-800/50 rounded-lg p-3 border border-stone-700/50">
                <p className="text-xs text-stone-400 flex items-start gap-2"><AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  You'll need a Stripe account. Setup instructions provided in the deployment guide.</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <Toggle checked={data.autoReconciliation} onChange={v => update("autoReconciliation", v)} label="Auto-Generate Reconciliation Codes" sublabel='Unique codes like "EF-104" for payment tracking' />
    </div>
  );

  /* ─── STEP 7: Sponsors & Services ─── */
  const renderSponsors = () => (
    <div className="space-y-6">
      {/* Sponsor Tiers */}
      <div>
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Award size={14} /> Sponsor Tiers</h3>
        <div className="space-y-3">
          {data.sponsorTiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-3 bg-stone-900/50 border border-stone-700 rounded-xl p-3">
              <Star size={16} className="text-amber-500 flex-shrink-0" />
              <input value={tier.name} onChange={e => { const t = [...data.sponsorTiers]; t[i] = { ...t[i], name: e.target.value }; update("sponsorTiers", t); }}
                className="flex-1 bg-transparent text-stone-200 text-sm focus:outline-none" placeholder="Tier name" />
              <span className="text-stone-500 text-sm">$</span>
              <input type="number" value={tier.amount} onChange={e => { const t = [...data.sponsorTiers]; t[i] = { ...t[i], amount: parseInt(e.target.value) || 0 }; update("sponsorTiers", t); }}
                className="w-24 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-stone-200 text-sm focus:outline-none" />
              {data.sponsorTiers.length > 1 && <button type="button" onClick={() => update("sponsorTiers", data.sponsorTiers.filter((_, j) => j !== i))} className="text-stone-600 hover:text-red-400"><X size={16} /></button>}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => update("sponsorTiers", [...data.sponsorTiers, { name: "", amount: 0 }])} className="mt-3 flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400"><Plus size={14} /> Add Tier</button>
      </div>

      {/* Sponsors */}
      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-4">Sponsors</h3>
        <ListManager items={data.sponsors} onChange={v => update("sponsors", v)}
          fields={[
            { key: "name", placeholder: "Sponsor name" },
            { key: "tier", type: "select", options: data.sponsorTiers.map(t => t.name), placeholder: "Tier" },
            { key: "logoUrl", placeholder: "Logo URL (optional)" },
            { key: "website", placeholder: "Website (optional)" },
          ]}
          addLabel="Add Sponsor" />
      </div>

      {/* Local Services */}
      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2"><Hotel size={14} /> Local Services</h3>
        <p className="text-xs text-stone-500 mb-4">Hotels, taxis, restaurants, etc. Shared with attendees for multi-day events.</p>
        <ListManager items={data.localServices} onChange={v => update("localServices", v)}
          fields={[
            { key: "name", placeholder: "Business name" },
            { key: "type", type: "select", options: ["Hotel / Accommodation", "Taxi / Transport", "Restaurant / Food", "Parking", "Medical / Pharmacy", "Other"], placeholder: "Type" },
            { key: "phone", placeholder: "Phone" },
            { key: "notes", placeholder: "Details, address, discount codes...", wide: true },
          ]}
          addLabel="Add Service" />
      </div>

      {/* Digital Gift Basket */}
      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2"><Gift size={14} /> Digital Gift Basket</h3>
        <p className="text-xs text-stone-500 mb-4">Discount codes and offers from local businesses, shared digitally with all attendees.</p>
        <ListManager items={data.giftBasket} onChange={v => update("giftBasket", v)}
          fields={[
            { key: "provider", placeholder: "Business name" },
            { key: "description", placeholder: "Offer (e.g., 15% off next visit)" },
            { key: "discountCode", placeholder: "Code (optional)" },
            { key: "website", placeholder: "Website (optional)" },
          ]}
          addLabel="Add Gift / Offer" />
      </div>
    </div>
  );

  /* ─── STEP 8: Volunteers & Staff ─── */
  const renderVolunteers = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2"><HandHelping size={14} /> Volunteer Roles</h3>
        <p className="text-xs text-stone-500 mb-4">Define the roles you need. Counts and descriptions feed into volunteer packages and guides.</p>
        <ListManager items={data.volunteerRoles} onChange={v => update("volunteerRoles", v)}
          fields={[
            { key: "title", placeholder: "Role title (e.g., BBQ Cook)" },
            { key: "count", placeholder: "# needed", type: "number" },
            { key: "description", placeholder: "What they'll do...", wide: true },
          ]}
          addLabel="Add Role" />
      </div>

      <Tip>
        Common roles: Tournament Referee, Registration Desk, BBQ / Kitchen, Bar Staff, Parking Attendant, Setup / Teardown Crew, Photographer, First Aid, MC / Announcer, Scoring Marshal.
      </Tip>

      <div className="border-t border-stone-800 pt-6">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-2"><ClipboardList size={14} /> Key Staff & Contacts</h3>
        <p className="text-xs text-stone-500 mb-4">People to contact if issues arise. Published in the resource directory.</p>
        <ListManager items={data.staffContacts} onChange={v => update("staffContacts", v)}
          fields={[
            { key: "name", placeholder: "Full name" },
            { key: "role", type: "select", options: STAFF_ROLES, placeholder: "Select role..." },
            { key: "phone", placeholder: "Phone" },
            { key: "email", placeholder: "Email" },
          ]}
          addLabel="Add Contact" />
      </div>
    </div>
  );

  /* ─── STEP 9: Deliverables ─── */
  const renderDeliverables = () => (
    <div className="space-y-6">
      <Tip>Select which artifacts to generate from your configuration. Each produces a downloadable document and/or a live page on your tournament site.</Tip>

      <div className="space-y-3">
        {[
          { key: "generateSchedule", icon: Calendar, label: "Event Schedule", desc: "General schedule with times, ceremonies, breaks" },
          { key: "generateRunSheet", icon: ClipboardList, label: "Game Run Sheet", desc: "Detailed match-by-match schedule with court assignments" },
          { key: "generateSiteMaps", icon: Map, label: "Site Maps", desc: "Digital and printable maps: venue overview, parking, field locations" },
          { key: "generateResourceDir", icon: Phone, label: "Resource Directory", desc: "Key contacts, emergency info, service providers" },
          { key: "generateVolunteerPkg", icon: HandHelping, label: "Volunteer Packages", desc: "Role guides: where to be, when, what to do" },
          { key: "generateStaffPkg", icon: Shield, label: "Staff Packages", desc: "Organizer guides with full event details and escalation paths" },
          { key: "generateServicePkg", icon: Car, label: "Service Provider Packages", desc: "Vendor/partner info: setup times, locations, contact chains" },
          { key: "enableAIAssistant", icon: Bot, label: "AI Q&A Assistant", desc: 'Multi-modal chatbot for "Where\'s the bathroom?" type questions' },
          { key: "enableGiftBasket", icon: Gift, label: "Digital Gift Basket", desc: "Shareable page of discounts and offers for attendees" },
        ].map(d => (
          <div key={d.key} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${data[d.key] ? "border-amber-500/40 bg-amber-500/5" : "border-stone-700 bg-stone-900/50"}`}
            onClick={() => update(d.key, !data[d.key])}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${data[d.key] ? "bg-amber-500/20" : "bg-stone-800"}`}>
              <d.icon size={18} className={data[d.key] ? "text-amber-500" : "text-stone-600"} />
            </div>
            <div className="flex-1">
              <p className={`text-sm font-semibold ${data[d.key] ? "text-amber-200" : "text-stone-400"}`}>{d.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">{d.desc}</p>
            </div>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${data[d.key] ? "bg-amber-500 border-amber-500" : "border-stone-600"}`}>
              {data[d.key] && <Check size={12} className="text-stone-950" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ─── STEP 10: Review ─── */
  const renderReview = () => {
    const sportLabel = data.sport === "other" ? data.sportOther : SPORTS.find(s => s.value === data.sport)?.label || "";
    const formatLabel = FORMATS.find(f => f.value === data.format)?.label || "";
    const checkedEquip = data.equipment.filter(e => e.checked).length;
    const checkedFac = data.facilities.filter(f => f.checked).length;
    const enabledDeliverables = ["generateSchedule", "generateRunSheet", "generateSiteMaps", "generateResourceDir", "generateVolunteerPkg", "generateStaffPkg", "generateServicePkg", "enableAIAssistant", "enableGiftBasket"].filter(k => data[k]).length;

    const Section = ({ title, icon: Icon, children }) => (
      <div className="bg-stone-900/60 border border-stone-700/60 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wider mb-3 flex items-center gap-2"><Icon size={14} className="text-amber-500" /> {title}</h3>
        <div className="space-y-1.5 text-sm">{children}</div>
      </div>
    );
    const Row = ({ label, value }) => value ? (
      <div className="flex justify-between gap-4"><span className="text-stone-500">{label}</span><span className="text-stone-200 font-medium text-right">{value}</span></div>
    ) : null;

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-4">
          <p className="text-sm text-amber-200">Review your configuration. Export the JSON to generate your full tournament platform.</p>
        </div>

        <Section title="Organization" icon={Building2}>
          <Row label="Name" value={data.orgName} /><Row label="Email" value={data.orgEmail} />
          <Row label="Logo" value={data.orgLogoUrl ? "Provided" : "—"} />
          <div className="flex gap-2 mt-2">{[data.primaryColor, data.secondaryColor, data.accentColor].map((c, i) => <div key={i} className="w-6 h-6 rounded-md border border-stone-600" style={{ backgroundColor: c }} />)}</div>
        </Section>

        <Section title="Event" icon={Trophy}>
          <Row label="Tournament" value={data.eventName} /><Row label="Sport" value={sportLabel} />
          <Row label="Days" value={`${data.eventDays} day${data.eventDays > 1 ? "s" : ""}`} />
          <Row label="Dates" value={data.eventDates.map(d => d.date).filter(Boolean).join(", ") || "—"} />
          <Row label="Venue" value={data.venueName} /><Row label={venueLabel} value={String(data.venueCount)} />
        </Section>

        <Section title="Venue & Equipment" icon={Tent}>
          <Row label="Equipment" value={`${checkedEquip}/${data.equipment.length} items confirmed`} />
          <Row label="Facilities" value={`${checkedFac}/${data.facilities.length} available`} />
          <Row label="Permits" value={`${data.permits.filter(p => p.checked).length}/${data.permits.length} secured`} />
        </Section>

        {data.isCharity && (
          <Section title="Cause & Fundraising" icon={Heart}>
            <Row label="Cause" value={data.causeName} />
            <Row label="Goal" value={data.fundraisingGoal > 0 ? `$${data.fundraisingGoal.toLocaleString()}` : "—"} />
            <Row label="Thermometer" value={data.showThermometer ? "Enabled" : "Off"} />
          </Section>
        )}

        <Section title="Tournament" icon={Zap}>
          <Row label="Format" value={formatLabel} /><Row label="Teams" value={`${data.minTeams}–${data.maxTeams}`} />
          <Row label="Players/Team" value={`${data.playersMin}–${data.playersMax}`} /><Row label="Points to Win" value={String(data.pointsToWin)} />
        </Section>

        <Section title="Registration" icon={Users}>
          <Row label="Deadline" value={data.regDeadline || "—"} />
          <Row label="Team Logos" value={data.allowTeamLogo ? "Yes" : "No"} />
          <Row label="Team Stories" value={data.allowTeamStory ? `Yes (${data.storyMaxWords} words)` : "No"} />
          <Row label="Image Consent" value={data.imageConsent ? "Required" : "No"} />
          <Row label="Waiver" value={data.waiverRequired ? "Required" : "No"} />
        </Section>

        <Section title="Fees" icon={DollarSign}>
          <Row label="Entry Fee" value={`$${data.entryFee}`} />
          <Row label="Payment" value={[data.paymentMethods.includes("e_transfer") && "e-Transfer", data.cashEnabled && "Cash", data.stripeEnabled && "Stripe"].filter(Boolean).join(", ")} />
        </Section>

        <Section title="Sponsors & Services" icon={Megaphone}>
          <Row label="Tiers" value={data.sponsorTiers.map(t => t.name).join(", ")} />
          <Row label="Sponsors" value={data.sponsors.length > 0 ? String(data.sponsors.length) : "—"} />
          <Row label="Local Services" value={data.localServices.length > 0 ? String(data.localServices.length) : "—"} />
          <Row label="Gift Basket" value={data.giftBasket.length > 0 ? `${data.giftBasket.length} offers` : "—"} />
        </Section>

        <Section title="Volunteers" icon={HandHelping}>
          <Row label="Roles" value={`${data.volunteerRoles.length} defined`} />
          <Row label="Volunteers Needed" value={String(data.volunteerRoles.reduce((s, r) => s + (parseInt(r.count) || 0), 0))} />
          <Row label="Staff Contacts" value={data.staffContacts.length > 0 ? String(data.staffContacts.length) : "—"} />
        </Section>

        <Section title="Deliverables" icon={Package}>
          <Row label="Artifacts" value={`${enabledDeliverables} selected`} />
        </Section>

        {/* Export */}
        <div className="border-t border-stone-800 pt-6 space-y-4">
          <button type="button" onClick={() => setShowExport(!showExport)}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm transition-all bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-[0.98]">
            <Download size={16} /> {showExport ? "Hide" : "Export"} Tournament Configuration
          </button>

          {showExport && (
            <div className="space-y-3">
              <div className="relative">
                <pre className="bg-stone-950 border border-stone-700 rounded-xl p-4 text-xs text-stone-400 overflow-auto max-h-64 font-mono">{exportConfig()}</pre>
                <button type="button" onClick={copyConfig}
                  className="absolute top-3 right-3 flex items-center gap-1.5 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 px-3 py-1.5 rounded-lg transition-colors">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const stepRenderers = [renderOrg, renderEvent, renderVenue, renderCause, renderFormat, renderReg, renderFees, renderSponsors, renderVolunteers, renderDeliverables, renderReview];

  /* ═══════════════════════════════════════════════════════════
     LAYOUT
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@700;800;900&display=swap');
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <header className="border-b border-stone-800 bg-stone-950/95 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy size={18} className="text-stone-950" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>Tournament Builder</h1>
              <p className="text-[10px] text-stone-500 uppercase tracking-widest font-semibold">Setup Wizard v2</p>
            </div>
          </div>
          <span className="text-xs text-stone-600 font-mono">Step {step + 1}/{STEPS.length}</span>
        </div>
      </header>

      {/* Progress */}
      <nav className="border-b border-stone-800/50 bg-stone-950/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button key={s.id} type="button" onClick={() => i <= step && setStep(i)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : isDone ? "text-stone-400 hover:text-stone-200 cursor-pointer"
                    : "text-stone-600 cursor-default"}`}>
                  {isDone ? <Check size={12} className="text-green-500" /> : <Icon size={12} />}
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>{STEPS[step].label}</h2>
          <p className="text-sm text-stone-500 mt-1">{STEPS[step].desc}</p>
        </div>
        <div className="animate-fadeIn" key={step}>{stepRenderers[step]()}</div>
      </main>

      {/* Footer Nav */}
      <footer className="sticky bottom-0 border-t border-stone-800 bg-stone-950/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button type="button" onClick={prev} disabled={step === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${step === 0 ? "text-stone-700" : "text-stone-300 hover:text-white hover:bg-stone-800"}`}>
            <ChevronLeft size={16} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${canProceed() ? "bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20 active:scale-[0.98]" : "bg-stone-800 text-stone-600"}`}>
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <div className="text-xs text-stone-500">Export above to finish</div>
          )}
        </div>
      </footer>
    </div>
  );
}
