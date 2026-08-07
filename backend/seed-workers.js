/**
 * seed-workers.js
 * ----------------------------------------------------------------
 * Generates worker records using the SAME categories, names, skills,
 * and bio templates as kam-app.html's genWorkers() function, then
 * inserts them into the `workers` table so the dashboard can be
 * powered by real database rows instead of random browser data.
 *
 * Run this ONCE:
 *   node seed-workers.js
 *
 * Safe to re-run: it clears the workers table first, so you won't
 * end up with duplicates if you run it more than once.
 * ----------------------------------------------------------------
 */

require('dotenv').config();
const pool = require('./db');

const categories = ['Plumber','Cleaner','Cook','Driver','Mason','Electrician','Gardener','Painter','Nanny','Carpenter','Security'];
const firstNames = ['Ram','Sita','Hari','Maya','Bikram','Sunita','Rajan','Anita','Deepak','Laxmi','Suresh','Kamala','Binod','Gita','Prakash','Mina','Narayan','Puja','Santosh','Sarita','Kiran','Bishnu','Anil','Rekha','Ganesh','Nirmala','Manoj','Sabita','Dinesh','Kavita','Umesh','Bimala','Rajesh','Sumitra','Pradeep','Sangita','Naresh','Mandira','Rohit','Shanti','Mohan','Durga','Bishal','Samjhana','Yam','Indira','Kedar','Bhawana','Tek','Champa'];
const lastNames = ['Sharma','Thapa','Karki','Tamang','Shrestha','Gurung','Rai','Limbu','Magar','Basnet','Bhandari','Adhikari','Poudel','Khadka','Subedi','Joshi','Koirala','Aryal','Regmi','Ghimire','Pandey','Dhakal','Tiwari','Upreti','Bhattarai','Chhetri','Parajuli','Budhathoki','Lama','Bohara','Bista','Dahal','Giri','Neupane','Niroula','Pathak','Pokharel','Rana','Shah'];
const avatarEmojis = ['👷','🧹','👨‍🍳','🚗','🧱','⚡','🌿','🎨','👶','🪵','🛡️'];

const bioTemplates = [
  'Experienced professional with {y}+ years of hands-on work. Known for punctuality and high-quality results. Served over {h} households in the Kathmandu Valley.',
  'Dedicated and hardworking {cat} with {y} years of experience. Client satisfaction is my top priority. Available on weekdays and weekends.',
  'Reliable {cat} with a strong work ethic. Completed over {j} jobs across Kathmandu, Lalitpur, and Bhaktapur. Certified and background-checked.',
];

const reviewTemplates = [
  { a: 'Ramesh K.', t: 'Very professional and punctual. Will hire again!' },
  { a: 'Sita M.', t: 'Did an excellent job. Clean work, no mess left behind.' },
  { a: 'Hari P.', t: 'Highly recommend! Fixed everything quickly.' },
  { a: 'Anita B.', t: 'Great attitude and skilled. Reasonable rates too.' },
  { a: 'Bikram T.', t: 'Arrived on time and the quality was outstanding.' },
];

const skillSets = {
  Plumber: ['Pipe Repair','Leak Detection','Drain Cleaning','Water Heater','Valve Replacement'],
  Cleaner: ['Deep Cleaning','Carpet Cleaning','Window Cleaning','Disinfection','Kitchen Scrub'],
  Cook: ['Nepali Cuisine','Indian Dishes','Chinese Food','Continental','Baking'],
  Driver: ['City Driving','Long Route','Airport Pickup','School Run','Cargo'],
  Mason: ['Brickwork','Plastering','Tiling','Foundation','Repointing'],
  Electrician: ['Wiring','Panel Upgrade','Lighting Install','CCTV Setup','Solar Panel'],
  Gardener: ['Lawn Mowing','Pruning','Planting','Irrigation','Composting'],
  Painter: ['Interior','Exterior','Texture Painting','Waterproofing','Polish'],
  Nanny: ['Infant Care','School Help','Cooking for Kids','First Aid','Night Care'],
  Carpenter: ['Furniture Making','Door Fitting','Cabinet Install','Repair','Custom Wood'],
  Security: ['24hr Guard','CCTV Monitor','Access Control','Patrol','Event Security'],
};

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genWorker(usedNames) {
  let fn, ln, name;
  do {
    fn = randChoice(firstNames);
    ln = randChoice(lastNames);
    name = `${fn} ${ln}`;
  } while (usedNames.has(name));
  usedNames.add(name);

  const cat = randChoice(categories);
  const rating = +(4 + Math.random()).toFixed(1);
  const jobs = Math.floor(50 + Math.random() * 400);
  const houses = Math.floor(20 + Math.random() * 150);
  const availability = randChoice(['avail', 'avail', 'avail', 'busy', 'off']);
  const yearsExperience = Math.floor(2 + Math.random() * 13);

  const bioTpl = randChoice(bioTemplates);
  const bio = bioTpl
    .replace('{y}', yearsExperience)
    .replace('{cat}', cat)
    .replace('{h}', houses)
    .replace('{j}', jobs);

  const pool = skillSets[cat] || skillSets.Plumber;
  const skills = pool.slice(0, 3 + Math.floor(Math.random() * 3));
  const reviews = [randChoice(reviewTemplates), randChoice(reviewTemplates)];
  const emoji = avatarEmojis[categories.indexOf(cat) % avatarEmojis.length];

  return { name, cat, rating, jobs, houses, availability, yearsExperience, bio, emoji, skills, reviews };
}

async function seed() {
  const usedNames = new Set();
  const workers = [];
  for (let i = 0; i < 96; i++) {
    workers.push(genWorker(usedNames));
  }
  workers.sort((a, b) => b.rating - a.rating);

  console.log(`Clearing existing workers…`);
  await pool.query('DELETE FROM workers');
  await pool.query('ALTER TABLE workers AUTO_INCREMENT = 1');

  console.log(`Inserting ${workers.length} workers…`);
  for (const w of workers) {
    await pool.query(
      `INSERT INTO workers
        (name, category, rating, jobs_completed, houses_served, availability, years_experience, bio, emoji, skills, reviews)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        w.name,
        w.cat,
        w.rating,
        w.jobs,
        w.houses,
        w.availability,
        w.yearsExperience,
        w.bio,
        w.emoji,
        JSON.stringify(w.skills),
        JSON.stringify(w.reviews),
      ]
    );
  }

  console.log('Done! 96 workers seeded into the database.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
