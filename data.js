// Sample data only — replace with the lead platform API.
const STATUSES = ['new', 'contacted', 'qualified', 'site-visit', 'proposal', 'won', 'lost'];
const STATUS_LABEL = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', 'site-visit': 'Site visit', proposal: 'Proposal', won: 'Won', lost: 'Lost' };
const SOURCES = ['Project enquiry', 'Contact Us', 'AI chat', 'WhatsApp', 'Newsletter', 'Campaign page'];
const PROJECTS = ['Intellion Edge', 'Intellion Park', 'Intellion Square', 'Intellion Greens'];
const CITIES = ['Gurugram', 'Noida', 'Bengaluru', 'Mumbai'];
const CAMPAIGNS = ['Organic', 'Google Search', 'LinkedIn', 'Meta Ads', 'Email'];
const TEAM = [
  { id: 'u1', name: 'Ananya Rao', role: 'Sales Exec', region: 'Gurugram' },
  { id: 'u2', name: 'Vikram Shah', role: 'Sales Exec', region: 'Noida' },
  { id: 'u3', name: 'Meera Iyer', role: 'Sales Exec', region: 'Bengaluru' },
  { id: 'u4', name: 'Karan Malhotra', role: 'Sales Exec', region: 'Mumbai' },
  { id: 'u5', name: 'Rohit Sethi', role: 'Regional Head', region: 'North' },
  { id: 'u6', name: 'Priya Nair', role: 'Administrator', region: 'All' },
];
const ROUTING = [
  { project: 'Intellion Edge', city: 'Gurugram', owner: 'u1', backup: 'u5' },
  { project: 'Intellion Park', city: 'Noida', owner: 'u2', backup: 'u5' },
  { project: 'Intellion Square', city: 'Bengaluru', owner: 'u3', backup: 'u6' },
  { project: 'Intellion Greens', city: 'Mumbai', owner: 'u4', backup: 'u6' },
];
const SLA_MINUTES = 30;

let seed = 42;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = a => a[Math.floor(rnd() * a.length)];
const NAMES = ['Aarav Mehta', 'Sana Khan', 'Rahul Bansal', 'Neha Kapoor', 'Arjun Verma', 'Pooja Desai', 'Sameer Joshi', 'Tanvi Gupta', 'Imran Sheikh', 'Divya Menon', 'Harsh Agarwal', 'Ritika Sen', 'Manish Kulkarni', 'Alisha Dsouza', 'Nitin Chawla', 'Shreya Pillai'];
const COMPANIES = ['Nexa Labs', 'Orbit Analytics', 'Finverse', 'Kite Logistics', 'BlueLeaf Health', 'Quanta Retail', 'Zenith Consulting', 'Pixelworks', 'Ardent Pharma', 'Meridian Capital'];

const NOW = Date.now();
const MIN = 60000;

function chanState(ok) { return ok ? 'ok' : (rnd() < .5 ? 'warn' : 'bad'); }

function makeLead(i, ageMin) {
  const route = pick(ROUTING);
  const source = pick(SOURCES);
  const created = NOW - ageMin * MIN;
  const touched = rnd() < .78 || ageMin > 240;
  const respMin = touched ? Math.max(1, Math.round(rnd() * rnd() * 70)) : null;
  const sIdx = !touched ? 0 : Math.min(6, 1 + Math.floor(rnd() * rnd() * 6.5));
  const emailOk = rnd() < .97;
  return {
    id: 'ILN-' + (24000 + i),
    name: pick(NAMES), company: pick(COMPANIES),
    email: 'contact' + i + '@example.com', phone: '+91 9' + String(100000000 + Math.floor(rnd() * 899999999)),
    project: route.project, city: route.city, source, campaign: pick(CAMPAIGNS),
    seats: pick(['20–40 seats', '50–100 seats', '100–250 seats', '8,000 sq ft', '15,000 sq ft']),
    timeline: pick(['Immediate', '1–3 months', '3–6 months', 'Exploring']),
    status: STATUSES[sIdx], owner: route.owner, created,
    firstResponse: touched ? created + respMin * MIN : null,
    ack: {
      email: emailOk ? (rnd() < .6 ? 'opened' : 'delivered') : 'failed',
      whatsapp: rnd() < .93 ? (rnd() < .8 ? 'read' : 'delivered') : 'failed',
      sms: rnd() < .96 ? 'delivered' : 'failed',
    },
    escalated: !touched && ageMin > SLA_MINUTES,
    consent: rnd() < .92,
  };
}

const LEADS = [];
for (let i = 0; i < 64; i++) {
  const age = i < 8 ? Math.round(rnd() * 90) : Math.round(90 + rnd() * 60 * 24 * 13);
  LEADS.push(makeLead(i, age));
}
LEADS.sort((a, b) => b.created - a.created);

const TEMPLATES = [
  { name: 'enquiry_acknowledgement', channel: 'WhatsApp', status: 'Approved', used: 412 },
  { name: 'callback_scheduled', channel: 'WhatsApp', status: 'Approved', used: 96 },
  { name: 'site_visit_confirmed', channel: 'WhatsApp', status: 'In review', used: 0 },
  { name: 'ENQ_ACK_SMS', channel: 'SMS (DLT)', status: 'Approved', used: 401 },
  { name: 'CALLBACK_SMS', channel: 'SMS (DLT)', status: 'Approved', used: 88 },
  { name: 'SITE_VISIT_SMS', channel: 'SMS (DLT)', status: 'Pending', used: 0 },
  { name: 'project_enquiry_email', channel: 'Email', status: 'Live', used: 418 },
  { name: 'contact_request_email', channel: 'Email', status: 'Live', used: 203 },
  { name: 'newsletter_welcome_email', channel: 'Email', status: 'Live', used: 157 },
];

const CONVOS = [
  { id: 'c1', who: 'Aarav Mehta', channel: 'Web chat', state: 'Lead captured', ago: 4, lead: 'ILN-24003', msgs: [
    ['user', 'Hi, do you have office space in Gurugram for around 60 people?'],
    ['bot', 'Yes — Intellion Edge in Gurugram offers flexible floor plates suited to 50–100 seats. May I know your company name and when you plan to move in?'],
    ['user', 'Nexa Labs, within 3 months.'],
    ['bot', 'Thanks! What\'s the best phone number and email to reach you?'],
    ['user', '+91 98765 43210, aarav@nexalabs.example'],
    ['sys', 'Lead ILN-24003 created · acknowledgement sent on Email, WhatsApp, SMS'],
    ['bot', 'All set. Our Gurugram sales team will call you shortly.'],
  ]},
  { id: 'c2', who: 'Sana Khan', channel: 'WhatsApp', state: 'Handed to agent', ago: 22, lead: 'ILN-24007', msgs: [
    ['user', 'What is the rent per sq ft at Intellion Park?'],
    ['bot', 'I can\'t confirm pricing or live availability, so I\'m connecting you with our sales team who can share accurate details.'],
    ['sys', 'Guardrail: commercial question escalated to sales'],
    ['sys', 'Handed over to Vikram Shah (business hours)'],
  ]},
  { id: 'c3', who: 'Visitor (unnamed)', channel: 'Web chat', state: 'After hours · callback booked', ago: 140, lead: 'ILN-24011', msgs: [
    ['user', 'Tell me about sustainability features.'],
    ['bot', 'Intellion buildings focus on energy-efficient design, water recycling and green certification targets. Want me to share project specifics?'],
    ['user', 'Yes, Bengaluru please. Call me tomorrow.'],
    ['sys', 'After hours · callback requested for 10:00 AM tomorrow'],
  ]},
  { id: 'c4', who: 'Neha Kapoor', channel: 'Web chat', state: 'Answered (no lead)', ago: 300, lead: null, msgs: [
    ['user', 'What amenities do you have?'],
    ['bot', 'Typical amenities include cafeteria, conference facilities, ample parking and 24×7 power backup. Would you like details for a specific city?'],
  ]},
];

const KB = [
  { topic: 'Projects', items: 4, updated: '2 days ago' }, { topic: 'Cities', items: 4, updated: '2 days ago' },
  { topic: 'Specifications', items: 18, updated: '1 week ago' }, { topic: 'Amenities', items: 12, updated: '1 week ago' },
  { topic: 'Sustainability', items: 7, updated: '3 weeks ago' }, { topic: 'FAQs', items: 36, updated: 'Yesterday' },
];

const COMPLIANCE = [
  ['Invisible bot check on all forms', true], ['Consent line + privacy link (DPDP Act 2023)', true],
  ['SMS sender ID registered (TRAI)', true], ['SMS templates DLT-approved', false],
  ['WhatsApp templates Meta-approved', false], ['Email domain SPF / DKIM / DMARC', true],
  ['Encryption at rest', true], ['Audit log enabled', true],
];
