// The roster this school starts an event with. When Supabase is connected these
// same students live in the database and the board is shared across phones.

const NAMES = [
  // Chemistry (24), Maya Reyes is the single pending tile
  'Maya Reyes', 'Aidan Whitfield', 'Priya Raghunathan', 'Marcus Bell', 'Sofia Delgado',
  'Ethan Kowalczyk', 'Naomi Osei', 'Liam Brennan', 'Chloe Nakamura', 'Isaiah Ford',
  'Amara Diallo', 'Gabriel Santos', 'Hannah Lindqvist', 'Omar Haddad', 'Ruby Castellanos',
  'Trevor Malone', 'Yasmin Farooqi', 'Caleb Ostrowski', 'Nina Petrov', 'Andre Beaumont',
  'Leila Mansour', 'Jonah Ashworth', 'Simone Duval', 'Kai Tupou',
  // Gym (20)
  'Jordan Pike', 'Bianca Moreau', 'Dmitri Volkov', 'Aisha Nkemelu', 'Colton Reyes',
  'Freya Lindgren', 'Malik Johnson', 'Esperanza Ruiz', 'Tobias Krause', 'Willa Hutchins',
  'Rafael Ibarra', 'Genevieve Cho', 'Santiago Vela', 'Delilah Grant', 'Nikhil Sharma',
  'Astrid Halvorsen', 'Quinn Docherty', 'Tamara Belfast', 'Emeka Nwosu', 'Rosalie Tran',
  // Library (14)
  'Beatrice Okafor', 'Hugo Berrigan', 'Lena Vasquez', 'Arjun Patel', 'Margot Sinclair',
  'Desmond Blake', 'Ingrid Solberg', 'Farid Rahimi', 'Talia Bergman', 'Xavier Montrose',
  'Josephine Wu', 'Rowan Fitzgerald', 'Camille Ndiaye', 'Silas Kaufman',
  // Room 204 (24)
  'Adaeze Obi', 'Mateo Guerrero', 'Harriet Coombs', 'Zaid Al-Amin', 'Poppy Radcliffe',
  'Owen Kavanagh', 'Suki Yamamoto', 'Bennett Crowley', 'Ilana Rosenfeld', 'Diego Marchetti',
  'Nadia Petrosyan', 'Grayson Tull', 'Fatima Bello', 'Oscar Lindqvist', 'Wren Salisbury',
  'Julius Ekwueme', 'Marisol Cabrera', 'Theodore Pham', 'Clara Vandenberg', 'Emmett Doyle',
  'Zuri Achebe', 'Roman Sokolov', 'Bethany Oyelaran', 'Anton Berger',
  // Cafeteria (18)
  'Imani Carter', 'Lucas Ferreira', 'Sadie Okonkwo', 'Pierre Lamarche', 'Anya Kuznetsova',
  'Kwame Boateng', 'Elodie Marchand', 'Braden Hollis', 'Mira Chandrasekar', 'Nolan Byrne',
  'Saoirse Kelleher', 'Victor Ashcombe', 'Layla Hakimi', 'Grant Whitmore', 'Odessa Klein',
  'Finnegan Rourke', 'Amelie Dubois', 'Terrence Adeyemi',
  // Absent (6)
  'Nathaniel Orozco', 'Sylvie Rousseau', 'Damon Achterberg', 'Hala Suleiman',
  'Peter Vandermeer', 'Ruth Alderman',
];

const CLUSTER_PLAN = [
  { name: 'Chemistry', count: 24, teacher: 'T. Whitfield' },
  { name: 'Gym', count: 20, teacher: 'D. Okonjo' },
  { name: 'Library', count: 14, teacher: 'L. Marchetti' },
  { name: 'Room 204', count: 24, teacher: 'K. Ansel' },
  { name: 'Cafeteria', count: 18, teacher: 'P. Whitcomb' },
  { name: 'Absent', count: 6, teacher: null },
];

function initials(name) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function buildClusters() {
  let i = 0;
  let id = 1000;
  return CLUSTER_PLAN.map((plan) => {
    const students = [];
    for (let n = 0; n < plan.count; n += 1) {
      const name = NAMES[i];
      i += 1;
      id += 7;
      students.push({
        id: `S-${id}`,
        name,
        initials: initials(name),
        cluster: plan.name,
        // Maya Reyes is the one student the field is waiting on.
        status: plan.name === 'Absent' ? 'absent' : name === 'Maya Reyes' ? 'pending' : 'verified',
      });
    }
    return { ...plan, students };
  });
}

export const CLUSTERS = buildClusters();

export const ALL_STUDENTS = CLUSTERS.flatMap((c) => c.students);

export const MAYA = ALL_STUDENTS.find((s) => s.name === 'Maya Reyes');

export const EVIDENCE = [
  { source: 'Morning attendance', reading: 'Present', time: '08:02' },
  { source: 'Assigned room', reading: 'Chemistry', time: '10:15' },
  { source: 'Teacher report', reading: 'Not with class', time: '10:31' },
  { source: 'Hall pass', reading: 'Sent to nurse', time: '10:24' },
  { source: 'Nurse checkpoint', reading: 'Unidentified student present', time: '10:29' },
];

export const SUGGESTION =
  'Probable match at Nurse Checkpoint. Two reports agree on time and destination. A staff member must verify.';

export const STAFF = [
  { name: 'T. Whitfield', room: 'Chemistry', seen: '10:31', state: 'ok' },
  { name: 'D. Okonjo', room: 'Gym', seen: '10:33', state: 'ok' },
  { name: 'L. Marchetti', room: 'Library', seen: '10:30', state: 'ok' },
  { name: 'K. Ansel', room: 'Room 204', seen: '10:29', state: 'ok' },
  { name: 'P. Whitcomb', room: 'Cafeteria', seen: 'no report', state: 'waiting', wait: 'No response, 4 min' },
  { name: 'R. Alvarez', room: 'Nurse checkpoint', seen: '10:34', state: 'ok' },
];

export const CONFLICTS = [
  { id: 'c1', text: 'Two rooms report Jordan Pike.', detail: 'Gym and Room 204 both list Jordan Pike as with them.' },
];

// The staff who own a room. A teacher signs in as one of these, and only ever
// sees the students on that roster.
export const TEACHERS = [
  { id: 'T-01', name: 'Tomas Whitfield', short: 'T. Whitfield', room: 'Chemistry', subject: 'Chemistry, room 118' },
  { id: 'T-02', name: 'Dara Okonjo', short: 'D. Okonjo', room: 'Gym', subject: 'Physical education' },
  { id: 'T-03', name: 'Lucia Marchetti', short: 'L. Marchetti', room: 'Library', subject: 'Library and study hall' },
  { id: 'T-04', name: 'Kwesi Ansel', short: 'K. Ansel', room: 'Room 204', subject: 'History, room 204' },
  { id: 'T-05', name: 'Priya Whitcomb', short: 'P. Whitcomb', room: 'Cafeteria', subject: 'Lunch supervision' },
  { id: 'T-06', name: 'Rosa Alvarez', short: 'R. Alvarez', room: 'Nurse checkpoint', subject: 'School nurse' },
];

export const ADMIN = { id: 'A-01', name: 'Miriam Osei', short: 'M. Osei', title: 'Principal' };

// The word an administrator types to start an event. One word, easy to say out
// loud across a room, and it is the only way the count starts moving.
export const EVENT_PASSWORD = 'cwb';

export const OFF_ROSTER = {
  id: 'S-9042',
  name: 'Devin Okoro',
  initials: 'DO',
  cluster: 'Gym',
  status: 'verified',
};

export const TEMPLATES = [
  {
    id: 'shelter',
    chip: 'Shelter in place',
    body:
      'Shelter in place is in effect at Northgate High. Students are with staff. Please do not come to campus. You will get an update here.',
  },
  {
    id: 'allclear',
    chip: 'All clear',
    body:
      'The event is over. Every student has been accounted for by a staff member. Regular schedule resumes at 11:15.',
  },
  {
    id: 'reunify',
    chip: 'Reunification open',
    body:
      'Reunification is open at Gate B. Bring photo ID. Only adults on your student’s authorized list can collect them.',
  },
];

export const LANGUAGES = ['English', 'Español', 'Tiếng Việt', '中文'];
