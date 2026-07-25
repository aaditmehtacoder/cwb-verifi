/**
 * What every screen is for, and what each control on it does.
 *
 * Nobody learns an emergency tool during the emergency. Each screen carries one
 * plain line about its job, and a question mark that opens the full list of its
 * buttons, so a teacher can read it during a quiet Tuesday and recognise it on
 * the worst day of the year.
 */

export const HELP = {
  home: {
    title: 'Home',
    line: 'Pick what you are. The count at the top is the whole school, live.',
    controls: [
      ['The count card', 'How many students a person has actually confirmed, out of everyone on campus. It changes by itself as other phones confirm.'],
      ['The six boxes', 'Who is holding this phone. Pick one and the app becomes that job and nothing else.'],
      ['Staff', 'Confirm students in front of you: by camera, by the code they recite, or by searching the board for their name.'],
      ['Administrator', 'The whole board: every student as a tile, the open cases, and the all clear.'],
      ['Teacher', 'Your own roster only, one student at a time.'],
      ['Student', 'The rotating code a student holds up, and the fixed one they learn by heart.'],
      ['Parent', 'What a family sees about their own child, and their pickup pass.'],
      ['Messages', 'One thread every phone in the building shares, plus an assistant that reads the board.'],
      ['The face, top right', 'Sign in with Google, Microsoft or Apple, so every student you confirm carries your name.'],
      ['Drill or Live', 'Drill is practice. Live means what you confirm is real. The bar at the top of every screen says which you are in.'],
      ['Start or End the event', 'Nothing counts, alerts, or records a location until an administrator starts an event. Ending one switches location off everywhere.'],
    ],
  },
  scan: {
    title: 'Confirm a student',
    line: 'Three ways to establish who somebody is. A person always makes the call.',
    controls: [
      ['Camera', 'Reads a student’s rotating code, and a guardian’s pickup pass at the gate. It scans by itself; there is no button.'],
      ['By code', 'For a student with no phone. Every student knows one fixed six-digit code by heart. They say it, you type it, and the board finds them.'],
      ['By name', 'Search every student on the shared board, not just the ones this phone loaded. Pick the right one, then ask them for their code before you confirm.'],
      ['The code boxes', 'Six digits. Ask the student to say it aloud; never read it out to them, because then it proves nothing.'],
      ['They cannot remember their code', 'The last resort. You confirm on your word alone. It is recorded as exactly that, with your name on it, and the board shows it differently.'],
      ['The face that appears', 'Check it against the person standing in front of you. A matching code is not a matching child.'],
      ['Confirm this student', 'Asks once more, then marks them confirmed under your name. This is the only thing that moves the count.'],
      ['A guardian pass', 'Scanning a parent’s pass shows which adults are allowed to collect that student. Check photo ID, then tap the one actually at the gate.'],
      ['The chip, top right', 'Where this phone is. The place is stamped on the confirmation.'],
    ],
  },
  admin: {
    title: 'The board',
    line: 'Every student as one tile. Ochre means nobody has confirmed them yet.',
    controls: [
      ['The four counts', 'Confirmed, still open, absent before the event, and released to a guardian.'],
      ['Find a student', 'Type any name to jump to them.'],
      ['A tile', 'Tap it for that student, where they were confirmed, and by whom.'],
      ['The map on a tile', 'On iPhone, where the confirmation happened, drawn by Apple Maps. The circle is the GPS accuracy, not a guess dressed up as a fact. Tap it to open Apple Maps proper for directions.'],
      ['Needs attention', 'The evidence for anyone still open, and what the assistant suggests. The assistant can suggest, never confirm.'],
      ['Scan to confirm', 'Opens the camera for that student.'],
      ['Ask for their location', 'Sends a request to that student\u2019s own phone. Nothing is shared unless they agree.'],
      ['I can see this student', 'Confirms them from here, if they are standing with you.'],
      ['Declare all clear', 'Locked until nobody is open. It cannot be forced.'],
      ['How a student was confirmed', 'Each tile records whether the code came off a phone, was recited from memory, was ticked off a roster, or was a staff member’s word alone. The four are not equally strong and the board says which.'],
      ['Staff, conflicts, announcement', 'Who has reported, rooms that disagree, and the message parents receive.'],
      ['Reset the board', 'Puts everything back to its opening position, on every phone, so the whole event can be run again. The roster is untouched.'],
      ['End drill', 'Ends the event and switches location off.'],
    ],
  },
  teacher: {
    title: 'Your room',
    line: 'Only your own roster. Confirm the students actually in front of you.',
    controls: [
      ['Your name, under the room', 'Which room this phone is counting, and who every confirmation is recorded under. Tap Change if it is not you.'],
      ['With me', 'Confirms that student under your name. You know them by sight, which is why this needs no code.'],
      ['Not here', 'Tells you straight away whether anybody else has them. If the nurse or another room already confirmed them, it says so and leaves their status alone. If nobody has them, it flags them to the board and asks when you last saw them.'],
      ['When did you last see them', 'One tap. It goes down the shared thread to whoever is deciding where to send the next search.'],
      ['A student’s name', 'Opens what the board knows about them: who has them, when, where, and how. Not a profile — no address, no contacts, nothing that does not change what you do next.'],
      ['Undo', 'Takes a confirmation back if you tapped the wrong row.'],
      ['Mark whole room present', 'Asks twice, because it vouches for everyone at once.'],
      ['Needs action, All, Confirmed', 'Filters the list. It opens on Needs action.'],
      ['SHARED BOARD chip', 'Whether other phones can see your count. If it says this phone only, keep confirming anyway; nothing you tap is lost.'],
      ['Not on your roster', 'A student from another room who is standing in yours.'],
    ],
  },
  student: {
    title: 'Your code',
    line: 'Hold up the code. Staff scan it. There is nothing else to do.',
    controls: [
      ['Show my code', 'Opens a code that changes every 30 seconds.'],
      ['The ring', 'Counts down to the next code. An old code stops working.'],
      ['Learn this by heart', 'A second code that never changes. If your phone is dead, in a locker, or not with you, say these six digits to a staff member and you still get counted. Do not tell it to another student.'],
      ['If the school asks for your location', 'Only during an emergency, and only if you agree. You can say no, and nothing is sent.'],
      ['Everything else', 'Deliberately absent. Students see no roster, no count, and no other student.'],
    ],
  },
  parent: {
    title: 'Your child',
    line: 'One line about your child, the moment a person confirms them.',
    controls: [
      ['The language button', 'English, Spanish, Vietnamese, or Chinese. It changes this whole screen.'],
      ['The ring', 'Staff are still checking. It is not a loading spinner and not a countdown.'],
      ['I am on my way', 'Tells the school you are coming and issues a pickup pass.'],
      ['The pass', 'A real code the gate scans. It says which student, not which adult, so staff still check your photo ID against the authorized list.'],
      ['The six digits under it', 'The same pass, spoken. Read them to the staff member if the scanner cannot read your screen.'],
      ['What you never see', 'Your child’s location, other students, or the board. That protects every child during an event.'],
    ],
  },
  chat: {
    title: 'Messages',
    line: 'One thread for every phone in the building, with an assistant that reads the board.',
    controls: [
      ['The text box', 'Anything you type reaches every phone at once.'],
      ['The suggestion chips', 'Common questions, one tap.'],
      ['The assistant', 'Answers questions about the board. It cannot confirm anyone, and it is labelled every time it speaks.'],
      ['A question mark', 'Ending a message with one asks the assistant. Without it, you are talking to people.'],
    ],
  },
  ready: {
    title: 'Ready check',
    line: 'Run this before a drill so nothing surprises you during one.',
    controls: [
      ['Each row', 'Tap it to grant what is missing.'],
      ['Take a reading now', 'Asks the GPS for one real position and shows it. A granted permission only means the phone did not refuse; this proves a fix actually arrives, which is the part that fails during an event.'],
      ['Send a test notification', 'Raises the exact alert a staff member gets when the last open student is confirmed. It comes from this phone, not a push server, so it needs no network.'],
      ['Shared board', 'Whether every phone is on the same count, and plainly what is wrong when they are not.'],
    ],
  },
};

export const helpFor = (route) => HELP[route] || null;
