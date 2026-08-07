let WORKERS = [];
let currentFilter = 'All';

const DEMO_WORKERS = [
  { name: 'Sabita Bista', cat: 'Electrician', rating: 5.0, jobs: 315, houses: 29, avail: 'avail', bio: 'Expert electrician with 10+ years of experience in residential wiring.', skills: ['Wiring','Repairs','Installation'], reviews: [{a:'Ramesh',t:'Excellent work, very professional.'},{a:'Sita',t:'Fixed everything quickly.'}], yr: 10 },
  { name: 'Bishal Budhathoki', cat: 'Electrician', rating: 5.0, jobs: 322, houses: 103, avail: 'avail', bio: 'Licensed electrician specializing in commercial projects.', skills: ['Commercial','Wiring','Lighting'], reviews: [{a:'Hari',t:'Great service!'},{a:'Gita',t:'Very reliable.'}], yr: 8 },
  { name: 'Sunita Shah', cat: 'Electrician', rating: 4.9, jobs: 252, houses: 148, avail: 'avail', bio: 'Skilled electrician with expertise in smart home installations.', skills: ['Smart Home','Wiring','Repairs'], reviews: [{a:'Ram',t:'Amazing work on my smart home.'}], yr: 6 },
  { name: 'Sangita Rana', cat: 'Electrician', rating: 4.7, jobs: 75, houses: 112, avail: 'avail', bio: 'Reliable electrician for all your home electrical needs.', skills: ['Repairs','Installation','Maintenance'], reviews: [{a:'Krishna',t:'Prompt and efficient.'}], yr: 5 },
  { name: 'Kiran Tamang', cat: 'Electrician', rating: 4.6, jobs: 355, houses: 133, avail: 'avail', bio: 'Experienced electrician with focus on safety and quality.', skills: ['Safety Inspection','Wiring','Repairs'], reviews: [{a:'Bikash',t:'Very thorough work.'}], yr: 12 },
  { name: 'Maya Giri', cat: 'Electrician', rating: 4.5, jobs: 282, houses: 116, avail: 'busy', bio: 'Professional electrician available for urgent repairs.', skills: ['Urgent Repairs','Wiring','Installation'], reviews: [{a:'Anita',t:'Came quickly and fixed the issue.'}], yr: 7 },
  { name: 'Prakash Bista', cat: 'Electrician', rating: 4.5, jobs: 342, houses: 139, avail: 'avail', bio: 'Dedicated electrician with strong customer service skills.', skills: ['Customer Service','Wiring','Lighting'], reviews: [{a:'Dipak',t:'Very friendly and professional.'}], yr: 9 },
  { name: 'Sangita Khadka', cat: 'Electrician', rating: 4.8, jobs: 128, houses: 45, avail: 'off', bio: 'Specialist in industrial electrical systems.', skills: ['Industrial','Heavy Wiring','Maintenance'], reviews: [{a:'Prem',t:'Great industrial work.'}], yr: 15 },
  { name: 'Bhawana Limbu', cat: 'Electrician', rating: 4.4, jobs: 89, houses: 67, avail: 'avail', bio: 'Young and energetic electrician with modern techniques.', skills: ['Modern Wiring','LED Installation','Repairs'], reviews: [{a:'Suman',t:'Good modern solutions.'}], yr: 3 },
  { name: 'Bhawana Rana', cat: 'Electrician', rating: 4.3, jobs: 156, houses: 78, avail: 'avail', bio: 'Reliable and affordable electrical services.', skills: ['Affordable','Wiring','Installation'], reviews: [{a:'Nabin',t:'Good value for money.'}], yr: 4 },
  { name: 'Deepak Upreti', cat: 'Electrician', rating: 4.2, jobs: 201, houses: 92, avail: 'avail', bio: 'Expert in solar panel electrical connections.', skills: ['Solar','Wiring','Green Energy'], reviews: [{a:'Raju',t:'Great solar setup.'}], yr: 8 },
  { name: 'Anil Koirala', cat: 'Electrician', rating: 4.1, jobs: 267, houses: 105, avail: 'avail', bio: 'Master electrician with all-around expertise.', skills: ['Master Electrician','All Services'], reviews: [{a:'Shyam',t:'True professional.'}], yr: 20 },
  { name: 'Ram Sharma', cat: 'Plumber', rating: 4.8, jobs: 420, houses: 180, avail: 'avail', bio: 'Expert plumber with 15 years of experience in pipe fitting and repairs.', skills: ['Pipe Fitting','Leak Repair','Installation'], reviews: [{a:'Hari',t:'Fixed my leak perfectly.'}], yr: 15 },
  { name: 'Sita Devi', cat: 'Cleaner', rating: 4.7, jobs: 350, houses: 120, avail: 'avail', bio: 'Professional house cleaner with attention to detail.', skills: ['Deep Cleaning','Organization','Sanitization'], reviews: [{a:'Gita',t:'House looks brand new!'}], yr: 8 },
  { name: 'Bikash Gurung', cat: 'Cook', rating: 4.9, jobs: 280, houses: 95, avail: 'avail', bio: 'Experienced chef specializing in Nepali and Continental cuisine.', skills: ['Nepali Cuisine','Continental','Baking'], reviews: [{a:'Ram',t:'Delicious food every time.'}], yr: 12 },
  { name: 'Dipesh Magar', cat: 'Driver', rating: 4.6, jobs: 500, houses: 50, avail: 'busy', bio: 'Safe and reliable driver with 10 years of experience.', skills: ['City Driving','Highway','Vehicle Maintenance'], reviews: [{a:'Sita',t:'Very safe driver.'}], yr: 10 },
  { name: 'Manoj Thapa', cat: 'Mason', rating: 4.5, jobs: 180, houses: 60, avail: 'avail', bio: 'Skilled mason for all construction and repair work.', skills: ['Bricklaying','Concrete','Plastering'], reviews: [{a:'Krishna',t:'Solid construction work.'}], yr: 14 },
  { name: 'Gopal Shrestha', cat: 'Gardener', rating: 4.8, jobs: 220, houses: 85, avail: 'avail', bio: 'Passionate gardener with expertise in landscaping.', skills: ['Landscaping','Plant Care','Lawn Maintenance'], reviews: [{a:'Anita',t:'Beautiful garden now!'}], yr: 9 },
  { name: 'Ramesh Poudel', cat: 'Painter', rating: 4.4, jobs: 310, houses: 110, avail: 'avail', bio: 'Professional painter for interior and exterior work.', skills: ['Interior','Exterior','Texture Painting'], reviews: [{a:'Bikash',t:'Clean and precise work.'}], yr: 11 },
  { name: 'Laxmi Rai', cat: 'Nanny', rating: 4.9, jobs: 150, houses: 45, avail: 'avail', bio: 'Caring nanny with early childhood education background.', skills: ['Child Care','Education','First Aid'], reviews: [{a:'Sunita',t:'Kids love her!'}], yr: 7 },
  { name: 'Hari Bahadur', cat: 'Carpenter', rating: 4.6, jobs: 275, houses: 90, avail: 'avail', bio: 'Master carpenter crafting custom furniture and repairs.', skills: ['Furniture','Custom Work','Repairs'], reviews: [{a:'Prem',t:'Beautiful custom table.'}], yr: 18 },
  { name: 'Shiva Kumar', cat: 'Security', rating: 4.3, jobs: 400, houses: 30, avail: 'avail', bio: 'Trained security guard with vigilance and discipline.', skills: ['Patrol','Access Control','Emergency Response'], reviews: [{a:'Dipak',t:'Very vigilant.'}], yr: 6 },
];

// Pool of real headshot photos used to give each worker a professional profile
// picture. Assigned deterministically from name (so a given worker always
// gets the same face across renders) rather than a cutesy icon per trade.
const AVATAR_POOL = [
  'https://randomuser.me/api/portraits/men/32.jpg',
  'https://randomuser.me/api/portraits/women/44.jpg',
  'https://randomuser.me/api/portraits/men/54.jpg',
  'https://randomuser.me/api/portraits/women/68.jpg',
  'https://randomuser.me/api/portraits/men/15.jpg',
  'https://randomuser.me/api/portraits/women/21.jpg',
  'https://randomuser.me/api/portraits/men/76.jpg',
  'https://randomuser.me/api/portraits/women/33.jpg',
  'https://randomuser.me/api/portraits/men/41.jpg',
  'https://randomuser.me/api/portraits/women/52.jpg',
  'https://randomuser.me/api/portraits/men/8.jpg',
  'https://randomuser.me/api/portraits/women/12.jpg',
  'https://randomuser.me/api/portraits/men/63.jpg',
  'https://randomuser.me/api/portraits/women/77.jpg',
  'https://randomuser.me/api/portraits/men/22.jpg',
  'https://randomuser.me/api/portraits/women/9.jpg',
  'https://randomuser.me/api/portraits/men/47.jpg',
  'https://randomuser.me/api/portraits/women/58.jpg',
  'https://randomuser.me/api/portraits/men/19.jpg',
  'https://randomuser.me/api/portraits/women/25.jpg',
  'https://randomuser.me/api/portraits/men/71.jpg',
  'https://randomuser.me/api/portraits/women/38.jpg',
];

