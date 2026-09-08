package com.worktrack;

import com.worktrack.domain.*;
import com.worktrack.repo.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.*;

/**
 * Freezes the clock so tests can talk about "during the shift" and "after it
 * ended" without depending on when the suite happens to run.
 */
@TestConfiguration
public class TestFixtures {

    /** Wednesday 10:00 Europe/London, mid-shift for the seeded pattern. */
    public static final ZoneId ZONE = ZoneId.of("Europe/London");
    public static final Instant NOW =
            ZonedDateTime.of(2026, 9, 9, 10, 0, 0, 0, ZONE).toInstant();

    @Bean
    @Primary
    public Clock fixedClock() {
        return Clock.fixed(NOW, ZONE);
    }

    public static Employee employee(EmployeeRepository repo, PasswordEncoder enc,
                                    String username, Role role) {
        return repo.save(new Employee(username, enc.encode("correct-horse"),
                "Test " + username, "TT", "REF-" + username, role));
    }

    public static Shift shiftOn(ShiftRepository repo, Employee e, LocalDate date) {
        return repo.save(new Shift(e, date, LocalTime.of(8, 0), LocalTime.of(16, 30),
                "Grade 8", "Manchester Central"));
    }

    public static LocalDate today() { return LocalDate.ofInstant(NOW, ZONE); }
}
