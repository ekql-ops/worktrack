# WorkTrack API

The backend the React frontend was missing. Spring Boot 3.5, PostgreSQL,
JWT auth, Flyway migrations.

![tests](https://github.com/ekql-ops/worktrack/actions/workflows/backend.yml/badge.svg)

## Why it exists

The frontend keeps everything in React state. Refresh the page and every
shift, session and clock-in is gone, and its four accounts and their
passwords are literals compiled into the JavaScript bundle — readable by
anyone who opens devtools. This replaces both: rows in Postgres, and
passwords that exist only as BCrypt hashes.

## Running it

```bash
cp .env.example .env      # then fill in JWT_SECRET
mvn spring-boot:run
```

Needs Java 21+ and a PostgreSQL database. `JWT_SECRET` has no default and
the app will not start without one — an app that falls back to a built-in
signing key is an app shipping with a public one.

To get sample staff and a week of shifts, set `DEMO_SEED=true` and
`DEMO_PASSWORD` to something. Seeding is skipped if the database already
has employees, so it cannot overwrite real data.

## Tests

```bash
mvn verify
```

26 tests. The suite runs against H2 in PostgreSQL mode with **the same
Flyway migration that runs in production**, so the schema is tested rather
than generated a second, different way.

`ClockService` takes an injected `java.time.Clock`, so tests can place "now"
mid-shift and assert on it, instead of sleeping or accepting whatever the
wall clock says.

## The API

| Method | Path | Who | Does |
|---|---|---|---|
| POST | `/api/auth/login` | anyone | Exchange credentials for a token |
| GET | `/api/auth/me` | signed in | The current user |
| GET | `/api/shifts` | signed in | Your shifts from today onwards |
| GET | `/api/sessions/current` | signed in | Your open session, or 204 |
| POST | `/api/sessions/clock-in` | signed in | Clock in to today's shift |
| POST | `/api/sessions/clock-out` | signed in | Clock out |
| GET | `/api/sessions/history` | signed in | Your past sessions |
| GET | `/api/admin/sessions/live` | admin | Everyone on site now |
| GET | `/api/admin/sessions` | admin | Full history |
| POST | `/api/admin/sessions/{id}/force-clock-out` | admin | Close someone's session |
| GET | `/actuator/health` | anyone | Liveness probe |

## Rules the tests pin down

- You can only clock in to **today's** shift. Clocking in against tomorrow's
  is what let the original app lose track of who was actually on site.
- One open session per employee, enforced by a unique constraint in the
  database rather than only by a check in the service, so two simultaneous
  requests cannot both succeed.
- A session can be closed once. Closing it again is refused by the entity.
- Login answers identically whether the password was wrong or the user does
  not exist, so the endpoint cannot be used to discover usernames.
- An employee token gets 403 on `/api/admin/**`.

## Notes on the schema

`work_sessions.open_for_employee` holds the employee id while a session is
open and `NULL` once it closes, with a `UNIQUE` constraint on it. Both
PostgreSQL and H2 allow repeated `NULL`s in a unique column, so this
enforces "at most one open session per employee" in a way that is portable
enough to be covered by the tests. A partial index would express the same
rule but only PostgreSQL would accept it, and the constraint would then go
untested.

## Deploying to Fly.io

`fly.toml` and the `Dockerfile` are both in this directory, so everything
below runs from here.

```bash
fly auth login
fly launch --no-deploy          # reads fly.toml; may rename the app
fly postgres create --name worktrack-db --region lhr
fly postgres attach worktrack-db
```

`attach` sets `DATABASE_URL` for you, but in libpq form
(`postgres://user:pass@host/db`), which JDBC does not accept. Convert it:

```bash
fly secrets set   DATABASE_URL="jdbc:postgresql://<host>:5432/<database>"   DATABASE_USERNAME="<user>"   DATABASE_PASSWORD="<password>"   JWT_SECRET="$(openssl rand -base64 48)"   CORS_ALLOWED_ORIGINS="https://ekql-ops.github.io"

fly deploy
fly logs
curl https://<app>.fly.dev/actuator/health
```

To seed the sample staff on first boot:

```bash
fly secrets set DEMO_SEED=true DEMO_PASSWORD="<something>"
```

Turn `DEMO_SEED` back to `false` afterwards — seeding is skipped once
employees exist, but leaving it on is a loaded gun pointed at an empty
database.

### Notes

- `min_machines_running = 0` scales to zero when idle, so the first request
  after a quiet spell pays a JVM cold start of a few seconds. Fine for a
  portfolio demo; raise it to 1 if that ever matters.
- The VM is set to 512mb. Fly's 256mb default is not enough for a JVM with
  Hibernate and a connection pool, and `JAVA_OPTS` caps the heap at 70% of
  the container rather than letting the JVM size itself for the host.

**Not yet deployed, and the Docker build has not been executed** — there is
no Docker daemon on the machine this was written on. Build it locally before
trusting it.
