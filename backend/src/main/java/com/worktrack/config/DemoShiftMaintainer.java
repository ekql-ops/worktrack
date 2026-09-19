package com.worktrack.config;

import com.worktrack.domain.Employee;
import com.worktrack.domain.Role;
import com.worktrack.domain.Shift;
import com.worktrack.repo.EmployeeRepository;
import com.worktrack.repo.ShiftRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Keeps the demo's shifts in the future.
 *
 * The original seeder wrote one week of shifts on first boot. That is fine for
 * a demo you run once, and wrong for one that sits on a portfolio: a week later
 * every shift is in the past, the list renders empty and nobody can clock in.
 *
 * This tops the window up instead of seeding once. It runs on demand rather
 * than on a schedule because the app scales to zero when idle — a @Scheduled
 * job would simply not fire while the machine is stopped, which is exactly the
 * situation that lets the shifts go stale.
 *
 * Off unless asked for, so a real deployment never invents shifts.
 */
@Component
@ConditionalOnProperty(name = "worktrack.demo.top-up-shifts", havingValue = "true")
public class DemoShiftMaintainer {

    private static final Logger log = LoggerFactory.getLogger(DemoShiftMaintainer.class);

    /** How far ahead to keep shifts populated. */
    static final int WINDOW_DAYS = 14;

    private static final LocalTime WEEKDAY_START = LocalTime.of(8, 0);
    private static final LocalTime WEEKDAY_END   = LocalTime.of(16, 30);
    private static final LocalTime SATURDAY_START = LocalTime.of(9, 0);
    private static final LocalTime SATURDAY_END   = LocalTime.of(13, 0);

    private static final String GRADE = "Grade 8";
    private static final String LOCATION = "Manchester Central";

    private final EmployeeRepository employees;
    private final ShiftRepository shifts;
    private final Clock clock;

    public DemoShiftMaintainer(EmployeeRepository employees, ShiftRepository shifts, Clock clock) {
        this.employees = employees;
        this.shifts = shifts;
        this.clock = clock;
    }

    /**
     * Ensures every employee has shifts covering today through today+13.
     * Idempotent: existing shifts are left alone, so calling this on every
     * request costs a handful of lookups and changes nothing once the window
     * is full. Past shifts are never touched — the history stays truthful.
     */
    @Transactional
    public void ensureUpcoming() {
        LocalDate today = LocalDate.now(clock);
        int created = 0;

        for (Employee e : employees.findAll()) {
            if (e.getRole() != Role.EMPLOYEE) continue;

            for (int i = 0; i < WINDOW_DAYS; i++) {
                LocalDate day = today.plusDays(i);
                if (day.getDayOfWeek() == DayOfWeek.SUNDAY) continue;
                if (shifts.findByEmployeeIdAndDate(e.getId(), day).isPresent()) continue;

                boolean saturday = day.getDayOfWeek() == DayOfWeek.SATURDAY;
                shifts.save(new Shift(e, day,
                        saturday ? SATURDAY_START : WEEKDAY_START,
                        saturday ? SATURDAY_END   : WEEKDAY_END,
                        GRADE, LOCATION));
                created++;
            }
        }

        if (created > 0) {
            log.info("Demo shift top-up created {} shifts from {}", created, today);
        }
    }
}
