package com.worktrack;

import com.worktrack.config.DemoShiftMaintainer;
import com.worktrack.domain.Employee;
import com.worktrack.domain.Role;
import com.worktrack.domain.Shift;
import com.worktrack.repo.EmployeeRepository;
import com.worktrack.repo.ShiftRepository;
import com.worktrack.service.ClockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;

import static com.worktrack.TestFixtures.employee;
import static com.worktrack.TestFixtures.shiftOn;
import static com.worktrack.TestFixtures.today;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * The demo originally seeded one week of shifts on first boot, so a week later
 * the list rendered empty and the clock-in flow was unreachable. These pin down
 * the top-up that replaced it.
 */
@SpringBootTest(properties = "worktrack.demo.top-up-shifts=true")
@ActiveProfiles("test")
@Import(TestFixtures.class)
@Transactional
class DemoShiftMaintainerTest {

    @Autowired DemoShiftMaintainer maintainer;
    @Autowired EmployeeRepository employees;
    @Autowired ShiftRepository shifts;
    @Autowired ClockService clocks;
    @Autowired PasswordEncoder encoder;

    Employee alice;

    @BeforeEach
    void setUp() {
        alice = employee(employees, encoder, "alice", Role.EMPLOYEE);
    }

    @Test
    void populatesTheComingFortnightWhenThereAreNoShifts() {
        maintainer.ensureUpcoming();

        assertThat(clocks.upcomingShifts(alice.getId())).isNotEmpty();
    }

    @Test
    void alwaysProducesAShiftForToday() {
        // The exact failure seen in production: a stale demo has employees but
        // no shift today, so the employee cannot clock in at all.
        maintainer.ensureUpcoming();

        assertThat(shifts.findByEmployeeIdAndDate(alice.getId(), today())).isPresent();
    }

    @Test
    void skipsSundays() {
        maintainer.ensureUpcoming();

        assertThat(clocks.upcomingShifts(alice.getId()))
                .extracting(s -> s.getDate().getDayOfWeek())
                .doesNotContain(DayOfWeek.SUNDAY);
    }

    @Test
    void isIdempotent() {
        maintainer.ensureUpcoming();
        int afterFirst = clocks.upcomingShifts(alice.getId()).size();

        maintainer.ensureUpcoming();
        maintainer.ensureUpcoming();

        assertThat(clocks.upcomingShifts(alice.getId())).hasSize(afterFirst);
    }

    @Test
    void leavesAnExistingShiftAlone() {
        Shift mine = shiftOn(shifts, alice, today());

        maintainer.ensureUpcoming();

        Shift stillThere = shifts.findByEmployeeIdAndDate(alice.getId(), today()).orElseThrow();
        assertThat(stillThere.getId()).isEqualTo(mine.getId());
    }

    @Test
    void doesNotTouchPastShifts() {
        LocalDate past = today().minusDays(30);
        shiftOn(shifts, alice, past);

        maintainer.ensureUpcoming();

        assertThat(shifts.findByEmployeeIdAndDate(alice.getId(), past)).isPresent();
    }

    @Test
    void doesNotGiveAdminsShifts() {
        Employee boss = employee(employees, encoder, "boss", Role.ADMIN);

        maintainer.ensureUpcoming();

        assertThat(clocks.upcomingShifts(boss.getId())).isEmpty();
    }

    @Test
    void everyGeneratedShiftEndsAfterItStarts() {
        maintainer.ensureUpcoming();

        assertThat(clocks.upcomingShifts(alice.getId()))
                .allSatisfy(s -> assertThat(s.getEndTime()).isAfter(s.getStartTime()));
    }
}
