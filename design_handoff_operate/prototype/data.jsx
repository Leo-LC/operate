/* global */
// Operate — sample data
// Lightly populated, realistic enough to show layout.
// Currency: THB. Employees + shops per Léo's brief.

const SHOPS = [
  { id: 'bkk-ekkamai',  name: 'Bangkok Ekkamai',  short: 'BKK Ekk',  city: 'Bangkok', tone: 'good' },
  { id: 'bkk-silom',    name: 'Bangkok Silom',    short: 'BKK Silom', city: 'Bangkok', tone: 'good' },
  { id: 'chiang-mai',   name: 'Chiang Mai',       short: 'CNX',      city: 'Chiang Mai', tone: 'info' },
  { id: 'pattaya',      name: 'Pattaya',          short: 'PTY',      city: 'Pattaya', tone: 'warn' },
  { id: 'phangan',      name: 'Phangan',          short: 'PHG',      city: 'Phangan', tone: 'info' },
  { id: 'samui',        name: 'Samui',            short: 'SMI',      city: 'Samui', tone: 'good' },
  { id: 'phuket-laguna',name: 'Phuket Laguna',    short: 'PKL',      city: 'Phuket', tone: 'good' },
  { id: 'resort-cnx',   name: 'Resort Chiang Mai',short: 'Res CNX',  city: 'Chiang Mai', tone: 'bronze' },
];

const EMPLOYEES = [
  { id: 'fon',     name: 'Fon Fon',    role: 'Barista', shopId: 'bkk-ekkamai',   pay: 18000, joined: '2024-03-10', tone: 'bronze' },
  { id: 'jordan',  name: 'Jordan J',   role: 'Manager', shopId: 'bkk-silom',     pay: 32000, joined: '2023-08-22', tone: 'good' },
  { id: 'lily',    name: 'Lily L',     role: 'Barista', shopId: 'chiang-mai',    pay: 17000, joined: '2024-11-05', tone: 'info' },
  { id: 'nong',    name: 'Nong Nong',  role: 'Animal care', shopId: 'samui',     pay: 20000, joined: '2024-01-18', tone: 'warn' },
  { id: 'samurai', name: 'Samurai S',  role: 'Manager', shopId: 'phuket-laguna', pay: 34000, joined: '2023-05-04', tone: 'bad' },
  { id: 'yuri',    name: 'Yuri Yuri',  role: 'Barista', shopId: 'pattaya',       pay: 17500, joined: '2025-02-14', tone: 'info' },
  { id: 'zinko',   name: 'Zinko Z',    role: 'Animal care', shopId: 'phangan',   pay: 19500, joined: '2024-07-30', tone: 'good' },
];

const ANIMALS = [
  { id: 'a1', name: 'Mochi',   species: 'Capybara', shopId: 'samui',         age: '3y',   status: 'good',  lastVet: '2026-04-12' },
  { id: 'a2', name: 'Pudding', species: 'Capybara', shopId: 'samui',         age: '2y',   status: 'good',  lastVet: '2026-04-12' },
  { id: 'a3', name: 'Daifuku', species: 'Capybara', shopId: 'phangan',       age: '4y',   status: 'watch', lastVet: '2026-03-02' },
  { id: 'a4', name: 'Bao',     species: 'Meerkat',  shopId: 'bkk-ekkamai',   age: '2y',   status: 'good',  lastVet: '2026-05-08' },
  { id: 'a5', name: 'Mango',   species: 'Meerkat',  shopId: 'bkk-ekkamai',   age: '1y',   status: 'good',  lastVet: '2026-05-08' },
  { id: 'a6', name: 'Coco',    species: 'Otter',    shopId: 'phuket-laguna', age: '3y',   status: 'good',  lastVet: '2026-04-30' },
  { id: 'a7', name: 'Suki',    species: 'Otter',    shopId: 'phuket-laguna', age: '2y',   status: 'good',  lastVet: '2026-04-30' },
  { id: 'a8', name: 'Toffee',  species: 'Capybara', shopId: 'chiang-mai',    age: '5y',   status: 'good',  lastVet: '2026-05-19' },
  { id: 'a9', name: 'Maple',   species: 'Capybara', shopId: 'chiang-mai',    age: '4y',   status: 'good',  lastVet: '2026-05-19' },
  { id: 'a10', name: 'Yuzu',   species: 'Sugar Glider', shopId: 'bkk-silom', age: '1y',   status: 'good',  lastVet: '2026-04-22' },
];

const REVIEWS = [
  { id: 'r1', source: 'Google', stars: 5, shopId: 'samui',         author: 'Hanna B.',  date: '2026-05-22', text: 'Sat with the capybaras for half an hour. Mochi fell asleep beside me. The coffee was honestly secondary — this was about the animals and they\'re clearly cared for.', replied: false },
  { id: 'r2', source: 'Google', stars: 5, shopId: 'bkk-ekkamai',   author: 'Marc T.',   date: '2026-05-21', text: 'Booked for our anniversary. Bao the meerkat was very curious. Staff explained their routines without being pushy about anything.', replied: true },
  { id: 'r3', source: 'Google', stars: 4, shopId: 'pattaya',       author: 'Anya P.',   date: '2026-05-20', text: 'Lovely time, the location is a bit hidden though — pin the entrance more clearly.', replied: false },
  { id: 'r4', source: 'TripAdv',stars: 5, shopId: 'chiang-mai',    author: 'Sam L.',    date: '2026-05-19', text: 'Toffee the capybara is a complete legend. We came back twice.', replied: true },
  { id: 'r5', source: 'Google', stars: 3, shopId: 'phangan',       author: 'Pete G.',   date: '2026-05-18', text: 'A little expensive for the time you get, but it was a nice break from the beach.', replied: false },
  { id: 'r6', source: 'Google', stars: 5, shopId: 'phuket-laguna', author: 'Iris D.',   date: '2026-05-17', text: 'Coco and Suki were swimming when we arrived — magical. Latte was great too.', replied: true },
  { id: 'r7', source: 'Google', stars: 2, shopId: 'pattaya',       author: 'James R.',  date: '2026-05-16', text: 'Felt a bit rushed at the end of our 30 mins. Animals were great though, no complaints about them.', replied: false },
  { id: 'r8', source: 'Google', stars: 5, shopId: 'bkk-silom',     author: 'Mei K.',    date: '2026-05-15', text: 'Yuzu the sugar glider climbed onto my hand for ten minutes. Staff knew exactly when to step in.', replied: true },
];

const DOCUMENTS = [
  { id: 'd1', title: 'Animal Welfare SOP', shopId: null, type: 'SOP', owner: 'jordan', updated: '2026-05-12', size: '218 KB' },
  { id: 'd2', title: 'Lease — Ekkamai 2025', shopId: 'bkk-ekkamai', type: 'Lease', owner: 'jordan', updated: '2026-04-30', size: '1.4 MB' },
  { id: 'd3', title: 'Vet records — Samui Q2', shopId: 'samui', type: 'Vet', owner: 'nong', updated: '2026-05-19', size: '640 KB' },
  { id: 'd4', title: 'Insurance certificate', shopId: null, type: 'Legal', owner: 'jordan', updated: '2026-02-01', size: '320 KB' },
  { id: 'd5', title: 'Onboarding handbook', shopId: null, type: 'HR', owner: 'samurai', updated: '2026-03-22', size: '4.2 MB' },
  { id: 'd6', title: 'Pattaya — facade permit', shopId: 'pattaya', type: 'Permit', owner: 'jordan', updated: '2026-05-04', size: '95 KB' },
  { id: 'd7', title: 'Pricing matrix 2026', shopId: null, type: 'Pricing', owner: 'jordan', updated: '2026-01-15', size: '78 KB' },
  { id: 'd8', title: 'Phangan — fire safety', shopId: 'phangan', type: 'Permit', owner: 'zinko', updated: '2026-05-21', size: '210 KB' },
];

const CONTACTS = [
  { id: 'c1', name: 'Khun Anan',    role: 'Landlord — Ekkamai',  phone: '+66 81 234 5678', email: 'anan@property.th', shopId: 'bkk-ekkamai' },
  { id: 'c2', name: 'Dr. Suchart',  role: 'Veterinarian',        phone: '+66 89 122 3344', email: 'dr.suchart@vet.th', shopId: null },
  { id: 'c3', name: 'Roong Coffee', role: 'Bean supplier',       phone: '+66 86 555 2211', email: 'sales@roong.coffee', shopId: null },
  { id: 'c4', name: 'Tina Lim',     role: 'Accountant',          phone: '+66 81 999 0001', email: 'tina@books.th', shopId: null },
  { id: 'c5', name: 'Phuket Build', role: 'Maintenance',         phone: '+66 88 121 2121', email: 'work@pkbuild.th', shopId: 'phuket-laguna' },
  { id: 'c6', name: 'Khun Sirin',   role: 'Insurance broker',    phone: '+66 81 700 7000', email: 'sirin@cover.th', shopId: null },
  { id: 'c7', name: 'Pattaya City', role: 'Permits office',      phone: '+66 38 411 200',  email: 'permits@city.pty', shopId: 'pattaya' },
];

// Accounting — 4 weeks, 7 days per week, each shop
// each day has sales, payments, expenses, hr, treasury net
function genDay(seed) {
  const r = (n) => Math.round((Math.sin(seed * 9301 + 49297) * 0.5 + 0.5) * n);
  const sales = 8000 + r(14000);
  const expenses = 2000 + r(6000);
  const hr = 1800 + r(2500);
  const payments = sales - r(2000);
  return { sales, expenses, hr, payments, net: sales - expenses - hr };
}

const ACCT_WEEKS = (function () {
  // 4 weeks ending May 24 2026 (Sun). Build mon-sun.
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weeks = [];
  let date = new Date(2026, 3, 27); // Apr 27 (Mon)
  for (let w = 0; w < 4; w++) {
    const week = { label: `Week ${w + 1}`, start: new Date(date), days: [] };
    for (let d = 0; d < 7; d++) {
      const dd = new Date(date);
      // per-shop entries
      const shopEntries = SHOPS.map((s, si) => {
        return { shopId: s.id, ...genDay(w * 100 + d * 10 + si + 7) };
      });
      const totals = shopEntries.reduce((acc, e) => ({
        sales: acc.sales + e.sales,
        expenses: acc.expenses + e.expenses,
        hr: acc.hr + e.hr,
        payments: acc.payments + e.payments,
        net: acc.net + e.net,
      }), { sales: 0, expenses: 0, hr: 0, payments: 0, net: 0 });
      week.days.push({
        date: dd,
        dayLabel: days[d],
        dateStr: dd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        shops: shopEntries, ...totals,
      });
      date.setDate(date.getDate() + 1);
    }
    week.totals = week.days.reduce((acc, d) => ({
      sales: acc.sales + d.sales,
      expenses: acc.expenses + d.expenses,
      hr: acc.hr + d.hr,
      payments: acc.payments + d.payments,
      net: acc.net + d.net,
    }), { sales: 0, expenses: 0, hr: 0, payments: 0, net: 0 });
    weeks.push(week);
  }
  return weeks;
})();

// Payments — current month payroll, 7 employees
const PAYMENTS = EMPLOYEES.map((e, i) => {
  const base = e.pay;
  const tips = 800 + (i % 5) * 250;
  const bonus = i === 1 || i === 4 ? 2500 : 0;
  const deduction = (i === 3 || i === 6) ? 600 : 0;
  const hours = 152 + (i % 4) * 8;
  const overtime = (i % 3 === 0) ? 6 : 0;
  const total = base + tips + bonus - deduction;
  const status = ['confirmed', 'draft', 'confirmed', 'paid', 'draft', 'confirmed', 'draft'][i];
  return {
    id: `p${i + 1}`, employeeId: e.id, employeeName: e.name, shopId: e.shopId,
    role: e.role, base, tips, bonus, deduction, hours, overtime, total, status,
    period: 'May 2026', dueDate: '2026-05-31',
    deductionReason: deduction > 0 ? 'Late check-in on May 12 (-2h) per attendance log' : null,
  };
});

// Reports — operations + treasury data
const REPORT_KPIS = {
  revenue: { value: 1248000, delta: 8.4, spark: [42, 48, 51, 46, 53, 61, 58, 64, 71, 68, 74, 82] },
  sessions: { value: 3120, delta: 4.2, spark: [120, 135, 130, 142, 148, 152, 159, 167, 165, 174, 178, 185] },
  avgRating: { value: 4.7, delta: 0.1, spark: [4.4, 4.5, 4.5, 4.6, 4.6, 4.7, 4.7, 4.7, 4.7, 4.7, 4.7, 4.8] },
  uplift: { value: 22.4, delta: -2.1, spark: [28, 26, 25, 24, 24, 23, 23, 22, 22, 23, 22, 22] },
};

const REVENUE_BY_SHOP = SHOPS.map((s, i) => ({
  shopId: s.id, name: s.short,
  revenue: 80000 + (Math.sin(i * 2.3) * 0.5 + 0.5) * 220000 + i * 8000,
  prior: 70000 + (Math.sin(i * 2.3 + 0.4) * 0.5 + 0.5) * 200000 + i * 7000,
}));

const REVENUE_MIX = [
  { label: 'Animal experience',  value: 62, color: 'var(--bronze)' },
  { label: 'F&B',                value: 24, color: 'var(--good)' },
  { label: 'Merch',              value:  9, color: 'var(--info)' },
  { label: 'Events / private',   value:  5, color: 'var(--warn)' },
];

// Treasury — 12 month projected cash with danger zone
const TREASURY = (function () {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  let cash = 1850000;
  return months.map((m, i) => {
    // simulate seasonal pattern: rainy season Sep-Nov dips
    const delta = [120, 200, 280, -180, -260, -340, 60, 220, 180, 240, 320, 380][i] * 1000;
    cash += delta;
    return { month: m, cash, delta, danger: cash < 800000 };
  });
})();

// Scheduling — week of May 25-31
const SCHEDULE_WEEK = (function () {
  const days = ['Mon 25', 'Tue 26', 'Wed 27', 'Thu 28', 'Fri 29', 'Sat 30', 'Sun 31'];
  const schedule = {};
  EMPLOYEES.forEach((e, ei) => {
    schedule[e.id] = days.map((d, di) => {
      const seed = (ei * 7 + di) % 9;
      if (seed === 0 || seed === 5) return null; // off
      const start = ['08:00', '09:00', '12:00', '14:00'][seed % 4];
      const end = ['16:00', '17:00', '20:00', '22:00'][seed % 4];
      return { start, end, shift: seed % 2 === 0 ? 'open' : 'close' };
    });
  });
  return { days, schedule };
})();

// Attendance — 30-day heatmap per employee
const ATTENDANCE = EMPLOYEES.map(e => {
  const days = [];
  for (let i = 0; i < 30; i++) {
    const r = Math.sin(e.name.charCodeAt(0) + i * 1.7) * 0.5 + 0.5;
    let status;
    if (i % 7 === 6 || i % 7 === 0) status = 'off';
    else if (r > 0.92) status = 'late';
    else if (r > 0.97) status = 'absent';
    else status = 'present';
    days.push(status);
  }
  return { employeeId: e.id, days };
});

// Wiki — pages
const WIKI = [
  { id: 'w1', title: 'Opening checklist', section: 'Operations', updated: '2026-05-12', author: 'Jordan J', excerpt: 'Five things every shop manager checks before unlocking the front door.' },
  { id: 'w2', title: 'Handling stressed animals', section: 'Animal care', updated: '2026-04-30', author: 'Nong Nong', excerpt: 'Calm voice, no fast movement, give them retreat space. The full protocol with photos.' },
  { id: 'w3', title: 'Refund policy', section: 'Customer', updated: '2026-03-22', author: 'Léo', excerpt: 'When we refund, when we re-book, when we just apologise and move on.' },
  { id: 'w4', title: 'Cash drawer reconciliation', section: 'Finance', updated: '2026-05-18', author: 'Tina Lim', excerpt: 'Step-by-step end-of-day flow including the variance threshold.' },
  { id: 'w5', title: 'Capybara feeding schedule', section: 'Animal care', updated: '2026-05-08', author: 'Nong Nong', excerpt: 'Morning veg, afternoon pellets, evening hay. Quantities by weight class.' },
  { id: 'w6', title: 'Brand voice quick rules', section: 'Brand', updated: '2026-02-14', author: 'Léo', excerpt: 'Warm not gushing. Specific not vague. We invite, we don\'t chase.' },
];

window.DATA = {
  SHOPS, EMPLOYEES, ANIMALS, REVIEWS, DOCUMENTS, CONTACTS,
  ACCT_WEEKS, PAYMENTS, REPORT_KPIS, REVENUE_BY_SHOP, REVENUE_MIX, TREASURY,
  SCHEDULE_WEEK, ATTENDANCE, WIKI,
};
window.shopName = (id) => (SHOPS.find(s => s.id === id) || { name: '—' }).name;
window.shopShort = (id) => (SHOPS.find(s => s.id === id) || { short: '—' }).short;
window.empName = (id) => (EMPLOYEES.find(e => e.id === id) || { name: '—' }).name;
window.emp = (id) => EMPLOYEES.find(e => e.id === id);
