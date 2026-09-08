package com.worktrack.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "work_sessions")
public class WorkSession {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id", nullable = false)
    private Shift shift;

    @Column(name = "clock_in_at", nullable = false)
    private Instant clockInAt;

    @Column(name = "clock_out_at")
    private Instant clockOutAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "ended_by")
    private EndedBy endedBy;

    /**
     * Mirrors employee_id while the session is open, NULL once it closes.
     * The database has a UNIQUE constraint on it, so a second concurrent
     * clock-in fails at the database rather than depending on the service
     * having checked first.
     */
    @Column(name = "open_for_employee")
    private UUID openForEmployee;

    protected WorkSession() { }

    public WorkSession(Employee employee, Shift shift, Instant clockInAt) {
        this.employee = employee;
        this.shift = shift;
        this.clockInAt = clockInAt;
        this.openForEmployee = employee.getId();
    }

    /** Closing is the only state change a session allows, and only once. */
    public void close(Instant at, EndedBy by) {
        if (clockOutAt != null) {
            throw new IllegalStateException("Session is already closed");
        }
        this.clockOutAt = at;
        this.endedBy = by;
        this.openForEmployee = null;
    }

    public boolean isOpen() { return clockOutAt == null; }

    public UUID getId()          { return id; }
    public Employee getEmployee(){ return employee; }
    public Shift getShift()      { return shift; }
    public Instant getClockInAt(){ return clockInAt; }
    public Instant getClockOutAt() { return clockOutAt; }
    public EndedBy getEndedBy()  { return endedBy; }
}
