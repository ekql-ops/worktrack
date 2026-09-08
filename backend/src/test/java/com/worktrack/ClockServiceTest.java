package com.worktrack;

import com.worktrack.domain.*;
import com.worktrack.repo.*;
import com.worktrack.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static com.worktrack.TestFixtures.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestFixtures.class)
@Transactional
class ClockServiceTest {

    @Autowired ClockService clocks;
    @Autowired EmployeeRepository employees;
    @Autowired ShiftRepository shifts;
    @Autowired WorkSessionRepository sessions;
    @Autowired PasswordEncoder encoder;

    Employee alice;

    @BeforeEach
    void setUp() {
        alice = employee(employees, encoder, "alice", Role.EMPLOYEE);
    }

    @Test
    void clockingInOpensASessionAgainstTodaysShift() {
        Shift today = shiftOn(shifts, alice, today());

        WorkSession s = clocks.clockIn(alice.getId());

        assertThat(s.isOpen()).isTrue();
        assertThat(s.getShift().getId()).isEqualTo(today.getId());
        assertThat(s.getClockInAt()).isEqualTo(NOW);
        assertThat(s.getClockOutAt()).isNull();
    }

    @Test
    void clockingInWithNoShiftTodayIsRejected() {
        shiftOn(shifts, alice, today().plusDays(1));   // tomorrow only

        assertThatThrownBy(() -> clocks.clockIn(alice.getId()))
                .isInstanceOf(ClockException.class)
                .hasMessageContaining("no shift scheduled today");
    }

    @Test
    void clockingInTwiceIsRejected() {
        shiftOn(shifts, alice, today());
        clocks.clockIn(alice.getId());

        assertThatThrownBy(() -> clocks.clockIn(alice.getId()))
                .isInstanceOf(ClockException.class)
                .hasMessageContaining("already clocked in");
    }

    @Test
    void clockingOutClosesTheSessionAsSelf() {
        shiftOn(shifts, alice, today());
        clocks.clockIn(alice.getId());

        WorkSession s = clocks.clockOut(alice.getId());

        assertThat(s.isOpen()).isFalse();
        assertThat(s.getClockOutAt()).isEqualTo(NOW);
        assertThat(s.getEndedBy()).isEqualTo(EndedBy.SELF);
    }

    @Test
    void clockingOutWhenNotClockedInIsRejected() {
        assertThatThrownBy(() -> clocks.clockOut(alice.getId()))
                .isInstanceOf(ClockException.class)
                .hasMessageContaining("not clocked in");
    }

    @Test
    void clockingOutThenInAgainIsAllowedOnTheSameDay() {
        shiftOn(shifts, alice, today());
        clocks.clockIn(alice.getId());
        clocks.clockOut(alice.getId());

        WorkSession second = clocks.clockIn(alice.getId());

        assertThat(second.isOpen()).isTrue();
        assertThat(sessions.findByEmployeeIdOrderByClockInAtDesc(alice.getId())).hasSize(2);
    }

    @Test
    void adminForceClockOutIsRecordedAsAdmin() {
        shiftOn(shifts, alice, today());
        WorkSession open = clocks.clockIn(alice.getId());

        WorkSession closed = clocks.forceClockOut(open.getId());

        assertThat(closed.getEndedBy()).isEqualTo(EndedBy.ADMIN);
        assertThat(closed.isOpen()).isFalse();
    }

    @Test
    void forcingOutAnAlreadyClosedSessionIsRejected() {
        shiftOn(shifts, alice, today());
        WorkSession s = clocks.clockIn(alice.getId());
        clocks.clockOut(alice.getId());

        assertThatThrownBy(() -> clocks.forceClockOut(s.getId()))
                .isInstanceOf(ClockException.class)
                .hasMessageContaining("already closed");
    }

    @Test
    void closingASessionTwiceIsRefusedByTheEntityItself() {
        shiftOn(shifts, alice, today());
        WorkSession s = clocks.clockIn(alice.getId());
        s.close(NOW, EndedBy.SELF);

        assertThatThrownBy(() -> s.close(NOW, EndedBy.ADMIN))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void upcomingShiftsExcludeThePast() {
        shiftOn(shifts, alice, today().minusDays(2));
        shiftOn(shifts, alice, today());
        shiftOn(shifts, alice, today().plusDays(3));

        assertThat(clocks.upcomingShifts(alice.getId()))
                .extracting(Shift::getDate)
                .containsExactly(today(), today().plusDays(3));
    }

    @Test
    void sessionIsNotOverrunningDuringTheShift() {
        shiftOn(shifts, alice, today());   // 08:00-16:30, clock frozen at 10:00
        WorkSession s = clocks.clockIn(alice.getId());

        assertThat(clocks.isOverrunning(s)).isFalse();
    }

    @Test
    void oneEmployeeClockedInDoesNotBlockAnother() {
        Employee bob = employee(employees, encoder, "bob", Role.EMPLOYEE);
        shiftOn(shifts, alice, today());
        shiftOn(shifts, bob, today());

        clocks.clockIn(alice.getId());
        WorkSession bobs = clocks.clockIn(bob.getId());

        assertThat(bobs.isOpen()).isTrue();
        assertThat(clocks.liveSessions()).hasSize(2);
    }
}
