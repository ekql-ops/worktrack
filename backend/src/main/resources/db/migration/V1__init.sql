-- Portable SQL: this runs on PostgreSQL in production and H2 in tests,
-- so it avoids vendor-specific types and default expressions. Identifiers
-- are generated in the application, not by the database.

CREATE TABLE employees (
    id            UUID         PRIMARY KEY,
    username      VARCHAR(64)  NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    full_name     VARCHAR(120) NOT NULL,
    initials      VARCHAR(4)   NOT NULL,
    employee_ref  VARCHAR(16)  NOT NULL UNIQUE,
    role          VARCHAR(16)  NOT NULL,
    active        BOOLEAN      NOT NULL
);

CREATE TABLE shifts (
    id          UUID        PRIMARY KEY,
    employee_id UUID        NOT NULL REFERENCES employees (id),
    shift_date  DATE        NOT NULL,
    start_time  TIME        NOT NULL,
    end_time    TIME        NOT NULL,
    grade       VARCHAR(32),
    location    VARCHAR(120),
    CONSTRAINT uq_shift_per_employee_per_day UNIQUE (employee_id, shift_date)
);

CREATE TABLE work_sessions (
    id           UUID      PRIMARY KEY,
    employee_id  UUID      NOT NULL REFERENCES employees (id),
    shift_id     UUID      NOT NULL REFERENCES shifts (id),
    clock_in_at  TIMESTAMP NOT NULL,
    clock_out_at TIMESTAMP,
    ended_by     VARCHAR(16),
    -- Holds employee_id while the session is open and NULL once it closes.
    -- Both PostgreSQL and H2 allow repeated NULLs in a UNIQUE column, so this
    -- enforces "at most one open session per employee" in the database and
    -- stays portable. A partial index would say the same thing but only
    -- PostgreSQL would accept it, which would leave the constraint untested.
    open_for_employee UUID UNIQUE
);

CREATE INDEX idx_shifts_employee_date ON shifts (employee_id, shift_date);
CREATE INDEX idx_sessions_employee     ON work_sessions (employee_id);
