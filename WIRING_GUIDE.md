# Supabase Wiring Guide
## How to connect each component to the database

Drop these files into your project:
```
src/
├── supabaseClient.js          ← copy from supabase-wiring/
├── services/
│   └── api.js                 ← copy from supabase-wiring/services/
├── hooks/
│   └── useRealtime.js         ← copy from supabase-wiring/hooks/
```

Then install the Supabase client:
```bash
npm install @supabase/supabase-js
```

Create `.env` in your project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Landing Page — Registration Form

Replace the form's `setState("success")` with an actual insert:

```jsx
import { registrations } from '@/services/api';

// In RegistrationForm component:
const handleSubmit = async () => {
  try {
    const result = await registrations.create(EVENT_ID, {
      teamName: t.teamName,
      slogan: t.slogan,
      captainName: t.captainName,
      captainEmail: t.captainEmail,
      captainPhone: t.captainPhone,
      captainShirt: t.captainShirt,
      captainDiet: t.captainDiet,
      paymentMethod: t.paymentMethod,
      donation: t.donation,
      imageConsent: t.imageConsent,
      waiverAccepted: t.waiverAccepted,
      story: t.story,
    });
    setReconCode(result.reconciliation_code);
    setState("success");
  } catch (err) {
    setError("Registration failed. Please try again.");
  }
};
```

## Landing Page — Volunteer Form

```jsx
import { volunteers } from '@/services/api';

const handleVolunteerSubmit = async () => {
  try {
    await volunteers.apply(EVENT_ID, {
      primaryRoleId: selectedRoleId,  // UUID from volunteer_roles table
      otherRoleIds: otherSelectedIds,
      firstName: v.firstName,
      lastName: v.lastName,
      email: v.email,
      phone: v.phone,
      experience: v.experience,
      certifications: v.certifications,
    });
    setSubmitted(true);
  } catch (err) {
    setError("Application failed. Please try again.");
  }
};
```

---

## Admin Dashboard — Registrations Panel

Replace mock data with live queries and batch submit:

```jsx
import { registrations, activityLog } from '@/services/api';
import { useRealtimeRegistrations } from '@/hooks/useRealtime';

function RegistrationsPanel({ eventId, adminUserId }) {
  const { data: regs, loading } = useRealtimeRegistrations(eventId);
  const [changes, setChanges] = useState({});

  const submitAll = async () => {
    const updates = Object.entries(changes).map(([id, fields]) => ({
      id: parseInt(id),
      ...fields,
      payment_confirmed_by: fields.payment_status === 'paid' ? adminUserId : undefined,
      payment_confirmed_at: fields.payment_status === 'paid' ? new Date().toISOString() : undefined,
      confirmed_at: fields.status === 'confirmed' ? new Date().toISOString() : undefined,
    }));
    
    await registrations.batchUpdate(updates);
    
    // Log each action
    for (const u of updates) {
      await activityLog.log(eventId, 
        u.payment_status === 'paid' ? 'payment_confirmed' : 'registration_rejected',
        'registration', u.id, u, adminUserId
      );
    }
    
    setChanges({});
  };
  
  // ... rest of component uses regs instead of MOCK_REGISTRATIONS
}
```

## Admin Dashboard — Volunteers Panel

```jsx
import { volunteers } from '@/services/api';

function VolunteersPanel({ eventId, adminUserId }) {
  const [data, setData] = useState([]);
  const [changes, setChanges] = useState({});

  useEffect(() => {
    volunteers.list(eventId).then(setData);
  }, [eventId]);

  const submitAll = async () => {
    const updates = Object.entries(changes).map(([id, status]) => ({
      id, status, approvedBy: status === 'approved' ? adminUserId : null,
    }));
    await volunteers.batchUpdate(updates);
    setChanges({});
    // Refresh
    const fresh = await volunteers.list(eventId);
    setData(fresh);
  };
}
```

## Admin Dashboard — Fundraising

```jsx
import { events } from '@/services/api';

const submitFundraising = async () => {
  await events.updateFundraising(eventId, currentAmount);
  setSaved(currentAmount);
};
```

---

## Admin Game Day — Check-In

```jsx
import { teams, matches } from '@/services/api';
import { useRealtimeTeams } from '@/hooks/useRealtime';

function CheckInPanel({ eventId, adminUserId }) {
  const { teams: teamList, checkedIn } = useRealtimeTeams(eventId);

  const handleCheckIn = async (teamId) => {
    await teams.checkIn(teamId, adminUserId);
    // Real-time hook auto-updates the list
  };

  const handleNoShow = async (matchId, winnerTeamId, loserTeamId) => {
    await matches.awardBye(matchId, winnerTeamId, loserTeamId);
  };
}
```

## Admin Game Day — Announcements

```jsx
import { announcements } from '@/services/api';

const sendAnnouncement = async (message) => {
  await announcements.create(eventId, message, {
    priority: 'normal',
    showOnTV: true,
    createdBy: adminUserId,
  });
  setMessage('');
  // Real-time hook auto-updates TV display and live page
};
```

---

## TV Display

Replace all mock data with real-time hooks:

```jsx
import { useRealtimeMatches, useRealtimeStandings, useRealtimeAreas, useRealtimeAnnouncements } from '@/hooks/useRealtime';
import { sponsors } from '@/services/api';

function TVDisplay({ eventId }) {
  const { matches, live } = useRealtimeMatches(eventId);
  const { pools } = useRealtimeStandings(eventId);
  const { data: areas } = useRealtimeAreas(eventId);
  const { data: anns } = useRealtimeAnnouncements(eventId);
  const [sponsorData, setSponsorData] = useState([]);

  useEffect(() => {
    sponsors.listTiers(eventId).then(setSponsorData);
  }, [eventId]);

  // Pass live data to each view component instead of MOCK constants
  // Courts, standings, brackets, and announcements all update
  // in real-time via WebSocket — no polling needed
}
```

## Live Page

```jsx
import { useRealtimeMatches, useRealtimeStandings, useRealtimeAnnouncements } from '@/hooks/useRealtime';

function LivePage({ eventId }) {
  const { matches, live, completed, upcoming } = useRealtimeMatches(eventId);
  const { pools } = useRealtimeStandings(eventId);
  const { data: anns } = useRealtimeAnnouncements(eventId);

  // When a captain submits a score, every fan's live page
  // updates automatically via the WebSocket subscription.
  // No refresh needed.
}
```

---

## Player Portal — OTP Flow

```jsx
import { otp, players } from '@/services/api';
import { useWatchMatch } from '@/hooks/useRealtime';

function PlayerPortal({ eventId }) {
  const [session, setSession] = useState(null);
  const [captain, setCaptain] = useState(null);

  // Step 1: Request OTP
  const requestOTP = async (phone) => {
    const result = await otp.request(eventId, phone);
    setSessionId(result.sessionId);
  };

  // Step 2: Verify code
  const verifyCode = async (code) => {
    const session = await otp.verify(sessionId, code);
    setCaptain(session.player);
  };

  // Step 3: Watch active match for real-time score updates
  const { match: activeMatch } = useWatchMatch(captain?.activeMatchId);

  // When home captain submits score, away captain's screen
  // auto-updates to show the verification prompt via WebSocket.
}
```

## Captain Score Submission

```jsx
import { matches } from '@/services/api';

// Home captain submits score
const handleScoreSubmit = async (scores) => {
  await matches.submitScore(
    activeMatch.id,
    scores.teamAScore,
    scores.teamBScore,
    captain.phone
  );
  // useWatchMatch auto-updates to show "waiting for verification"
};

// Away captain verifies
const handleVerify = async () => {
  await matches.verifyScore(activeMatch.id);
  // Match status changes to "completed"
  // TV display, live page, and standings all update instantly
};

// Away captain disputes
const handleDispute = async (reason) => {
  await matches.disputeScore(activeMatch.id, reason);
  // Admin/referee gets notified via realtime
};
```

---

## Serverless Functions Needed

### `/api/send-otp.js` (Netlify/Vercel)

```js
// netlify/functions/send-otp.js
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key, not anon
);
const twilioClient = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function handler(event) {
  const { eventId, phone } = JSON.parse(event.body);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Store OTP session
  const { data: session } = await supabase
    .from('otp_sessions')
    .insert({ event_id: eventId, phone, otp_code: code, expires_at: expiresAt })
    .select()
    .single();

  // Send SMS
  await twilioClient.messages.create({
    body: `Your ETRC Bocce Classic captain code is: ${code}`,
    from: process.env.TWILIO_PHONE,
    to: phone,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, sessionId: session.id }),
  };
}
```

### `/api/create-stripe.js`

```js
// netlify/functions/create-stripe.js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  const { amount, reconCode, teamName, email } = JSON.parse(event.body);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'cad',
        product_data: { name: `ETRC Bocce Classic — ${teamName}` },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1,
    }],
    customer_email: email,
    metadata: { reconciliation_code: reconCode },
    mode: 'payment',
    success_url: `${process.env.SITE_URL}/registered?code=${reconCode}`,
    cancel_url: `${process.env.SITE_URL}/#register`,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url }),
  };
}
```

---

## Environment Variables Summary

### `.env` (local dev — never commit)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
```

### Netlify/Vercel environment (deployment)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key (not anon!)
TWILIO_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth
TWILIO_PHONE=+1234567890
STRIPE_SECRET_KEY=sk_test_xxx
SITE_URL=https://your-tournament.netlify.app
```
