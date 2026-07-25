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

const numberIn = (id) => parseInt(String(id).replace(/\D/g, ''), 10) || 0;

/**
 * The code a student is expected to know by heart.
 *
 * The six digits on the student screen rotate every thirty seconds, which is
 * exactly right while a phone is in a hand and worthless the moment it is not.
 * A flat battery, a phone in a locker, a phone confiscated that morning, a
 * student who never carries one: those are the ordinary cases, not the edge
 * cases. So every student also carries one fixed code, learned the way a locker
 * combination is learned, and reciting it out loud is enough for a staff member
 * to be sure they have the right child.
 *
 * It is derived rather than stored so the app and the database agree without a
 * seeding step ever running. `supabase/schema.sql` reproduces this arithmetic
 * verbatim, so both sides always land on the same number. A real deployment
 * issues random codes and stores only a hash of each, which is the one thing
 * that must change before this leaves a demo.
 */
export function codeFor(id) {
  return String(100000 + ((numberIn(id) * 7919) % 900000));
}

/**
 * The code on a guardian's pickup pass. Different multiplier, so knowing a
 * student's own code never yields the code that releases them.
 */
export function guardianCodeFor(id) {
  return String(100000 + ((numberIn(id) * 6271) % 900000));
}

/** 874 433, the way a person reads it aloud. */
export const spaced = (code) => `${String(code).slice(0, 3)} ${String(code).slice(3)}`;

function buildClusters() {
  let i = 0;
  let id = 1000;
  return CLUSTER_PLAN.map((plan) => {
    const students = [];
    for (let n = 0; n < plan.count; n += 1) {
      const name = NAMES[i];
      i += 1;
      id += 7;
      const sid = `S-${id}`;
      students.push({
        id: sid,
        name,
        initials: initials(name),
        cluster: plan.name,
        code: codeFor(sid),
        guardianCode: guardianCodeFor(sid),
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
  code: codeFor('S-9042'),
  guardianCode: guardianCodeFor('S-9042'),
  status: 'verified',
};

/**
 * The adults allowed to collect a student.
 *
 * Reunification is the part of an event that goes wrong quietly: a child handed
 * to the wrong adult is a worse outcome than a slow queue, and it is the one
 * mistake that cannot be undone afterwards. So the pass a guardian carries is
 * checked against this list by name, and the release is still a person looking
 * at a person, exactly like every other confirmation in this product.
 */
export const GUARDIANS = [
  { studentId: MAYA.id, name: 'Elena Reyes', relation: 'Mother', phone: '(503) 555-0148' },
  { studentId: MAYA.id, name: 'Victor Reyes', relation: 'Father', phone: '(503) 555-0192' },
];

export const guardiansFor = (studentId) => GUARDIANS.filter((g) => g.studentId === studentId);

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
