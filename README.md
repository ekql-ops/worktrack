# WorkTrack ⏱

A clean employee shift clock-in/out system built with React.

## Why I built this

I came up with the idea while working a job that used an app called **Smart Task Engage** to handle shift clock-ins — it was buggy and honestly pretty frustrating to use day to day. I started wondering what a smoother, more reliable version of that could look like, and built WorkTrack mostly for fun and as a learning project.

It's not affiliated with or built for any specific company — just something I put together out of curiosity that ended up working better than I expected. Sharing it here in case it's useful as inspiration for anyone building something similar, or wanting to learn how a shift-based login/logout system can be put together with React.

---

## Features

- **Shift list view** — employees see all upcoming confirmed shifts (Mon–Sat). Only today's shift is tappable.
- **Tap to clock in** — tapping today's shift opens a login modal. Correct credentials clock the employee in instantly.
- **Live countdown ring** — animated SVG ring counting down to shift end. Turns amber under 10 mins, red on overtime.
- **Late warning** — persistent pulsing banner if an employee is still clocked in after shift end.
- **Admin panel** — sidebar layout with live session view and full session history. Admins can force-clock out any employee.
- **Progress bar** — visual shift progress on the employee dashboard.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v16 or higher
- npm (comes with Node)

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/worktrack.git
cd worktrack

# 2. Install dependencies
npm install

# 3. Start the dev server
npm start
```

Opens at `http://localhost:3000`

---

## Demo Credentials

### Admin
| Username | Password |
|----------|----------|
| admin    | admin123 |

### Employees
| Username      | Password |
|---------------|----------|
| james.wright  | pass123  |
| priya.sharma  | pass123  |
| dan.okafor    | pass123  |
| lucy.chen     | pass123  |

---

## Shift Hours

Production shift: **18:30 – 21:00**

The app is currently in **testing mode** — shift window is set to `now → now + 30 minutes` so you can test the full flow at any time.

To switch to production hours, open `src/App.jsx` and follow the comment at the top of the file (around line 6).

---

## Project Structure

```
worktrack/
├── public/
│   └── index.html
├── src/
│   ├── App.jsx       # All components and logic
│   └── index.js      # React entry point
├── .gitignore
├── package.json
└── README.md
```

---

## Roadmap

- [ ] Backend integration (Node.js + Express)
- [ ] Persistent session storage (database)
- [ ] Multi-location support
- [ ] Export session history to CSV
- [ ] Push notifications for shift reminders
- [ ] Manager approval for late clock-outs

---

## Built With

- [React 18](https://react.dev/)
- [DM Sans & DM Mono](https://fonts.google.com/) — Google Fonts
- No external UI libraries — all styles written from scratch

---

*Built by Akira · WorkTrack v1.0*
