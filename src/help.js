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
    line: 'Pick what you are doing. The count at the top is the whole school, live.',
    controls: [
      ['The count card', 'How many students a person has actually confirmed, out of everyone on campus. It changes by itself as other phones confirm.'],
      ['Staff', 'Opens the camera to scan a student code. This is the main job during an event.'],
      ['Administrator', 'The whole board: every student as a tile, the open cases, and the all clear.'],
      ['Teacher', 'Your own roster only, one student at a time.'],
      ['Student', 'The code a student holds up for staff to scan.'],
      ['Parent', 'What a family sees about their own child.'],
      ['The face, top right', 'Sign in, so every student you confirm carries your name.'],
      ['The green circle, bottom right', 'Messages. One thread for every phone, with an assistant that reads the board.'],
      ['Drill or Live', 'Drill is practice. Live means what you confirm is real. The bar at the top of every screen says which you are in.'],
      ['Start or End the event', 'Ends the drill for this phone and switches location off.'],
    ],
  },
  scan: {
    title: 'Scan a student',
    line: 'Point the camera at a student code, then confirm you can see them.',
    controls: [
      ['The camera box', 'Reads the code automatically. You do not press anything to scan.'],
      ['The face that appears', 'Check it against the person standing in front of you before confirming.'],
      ['Confirm this student', 'Asks once more, then marks them confirmed under your name. This is the only thing that moves the count.'],
      ['Not this student', 'Clears the result and goes back to scanning.'],
      ['Phone dead or no code', 'Type the last four digits of their student number instead.'],
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
      ['Needs attention', 'The evidence for anyone still open, and what the assistant suggests. The assistant can suggest, never confirm.'],
      ['Scan to confirm', 'Opens the camera for that student.'],
      ['Ask for their location', 'Sends a request to that student\u2019s own phone. Nothing is shared unless they agree.'],
      ['I can see this student', 'Confirms them from here, if they are standing with you.'],
      ['Declare all clear', 'Locked until nobody is open. It cannot be forced.'],
      ['Staff, conflicts, announcement', 'Who has reported, rooms that disagree, and the message parents receive.'],
      ['End drill', 'Ends the event and switches location off.'],
    ],
  },
  teacher: {
    title: 'Your room',
    line: 'Only your own roster. Confirm the students actually in front of you.',
    controls: [
      ['With me', 'Confirms that student under your name.'],
      ['Not here', 'Flags them for the board so somebody goes looking.'],
      ['Undo', 'Takes a confirmation back if you tapped the wrong row.'],
      ['Mark whole room present', 'Asks twice, because it vouches for everyone at once.'],
      ['Needs action, All, Confirmed', 'Filters the list. It opens on Needs action.'],
      ['OFFLINE chip', 'Your taps are saved on this phone and sync when the network returns.'],
      ['Not on your roster', 'A student from another room who is standing in yours.'],
    ],
  },
  student: {
    title: 'Your code',
    line: 'Hold up the code. Staff scan it. There is nothing else to do.',
    controls: [
      ['Show my code', 'Opens a code that changes every 30 seconds.'],
      ['The ring', 'Counts down to the next code. An old code stops working.'],
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
      ['The pass', 'Show it at the gate. Only adults on the authorized list can collect.'],
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
      ['Send a test notification', 'Proves alerts reach this phone before you need them.'],
    ],
  },
};

export const helpFor = (route) => HELP[route] || null;
