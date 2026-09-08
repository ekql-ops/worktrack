package com.worktrack.service;

import com.worktrack.domain.*;
import com.worktrack.repo.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.List;
import java.util.UUID;

/**
 * The clock-in/out rules.
 *
 * A Clock is injected rather than calling Instant.now() directly, so tests can
 * place "now" at a shift boundary and assert the behaviour there instead of
 * sleeping or accepting whatever the wall clock happens to say.
 */
@Service
public class ClockService {

    private final ShiftRepository shifts;
    private final WorkSessionRepository sessions;
    private final EmployeeRepository employees;
    private final Clock clock;
    private final ZoneId zone;

    public ClockService(ShiftRepository shifts, WorkSessionRepository sessions,
                        EmployeeRepository employees, Clock clock) {
        this.shifts = shifts;
        this.sessions = sessions;
        this.employees = employees;
        this.clock = clock;
        this.zone = clock.getZone();
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    /** Shifts from today onwards — the list the employee sees. */
    public List<Shift> upcomingShifts(UUID employeeId) {
        return shifts.findByEmployeeIdAndDateGreaterThanEqualOrderByDateAsc(employeeId, today());
    }

    public java.util.Optional<WorkSession> openSession(UUID employeeId) {
        return sessions.findByEmployeeIdAndClockOutAtIsNull(employeeId);
    }

    /**
     * Clock in to today's shift. Only today's counts: clocking in against
     * tomorrow's shift is what made the old app lose track of who was on site.
     */
    @Transactional
    public WorkSession clockIn(UUID employeeId) {
        if (openSession(employeeId).isPresent()) {
            throw ClockException.alreadyClockedIn();
        }
        Shift shift = shifts.findByEmployeeIdAndDate(employeeId, today())
                .orElseThrow(ClockException::noShiftToday);

        Employee employee = employees.findById(employeeId)
                .orElseThrow(ClockException::noShiftToday);

        return sessions.save(new WorkSession(employee, shift, clock.instant()));
    }

    @Transactional
    public WorkSession clockOut(UUID employeeId) {
        WorkSession session = openSession(employeeId)
                .orElseThrow(ClockException::notClockedIn);
        session.close(clock.instant(), EndedBy.SELF);
        return sessions.save(session);
    }

    /** Admin override for someone who left without clocking out. */
    @Transactional
    public WorkSession forceClockOut(UUID sessionId) {
        WorkSession session = sessions.findWithDetailsById(sessionId)
                .orElseThrow(ClockException::sessionNotFound);
        if (!session.isOpen()) {
            throw ClockException.sessionAlreadyClosed();
        }
        session.close(clock.instant(), EndedBy.ADMIN);
        return sessions.save(session);
    }

    public List<WorkSession> liveSessions()    { return sessions.findByClockOutAtIsNullOrderByClockInAtAsc(); }
    public List<WorkSession> allSessions()     { return sessions.findAllByOrderByClockInAtDesc(); }
    public List<WorkSession> historyFor(UUID employeeId) {
        return sessions.findByEmployeeIdOrderByClockInAtDesc(employeeId);
    }

    /** True once the shift's end time has passed and the employee is still on. */
    public boolean isOverrunning(WorkSession session) {
        if (!session.isOpen()) return false;
        Shift shift = session.getShift();
        Instant end = ZonedDateTime.of(shift.getDate(), shift.getEndTime(), zone).toInstant();
        return clock.instant().isAfter(end);
    }
}
