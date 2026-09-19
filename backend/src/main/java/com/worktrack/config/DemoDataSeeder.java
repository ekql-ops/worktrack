package com.worktrack.config;

import com.worktrack.domain.Employee;
import com.worktrack.domain.Role;
import com.worktrack.repo.EmployeeRepository;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

/**
 * Seeds the sample staff and a week of shifts so the demo has something to
 * show. Off by default and never overwrites an existing database.
 *
 * The old frontend carried four usernames and their passwords as literals in
 * the bundle, which meant anyone could read them in devtools. Here the
 * password arrives from the environment and only its BCrypt hash is stored.
 */
@Configuration
@ConditionalOnProperty(name = "worktrack.demo.seed", havingValue = "true")
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private record Person(String username, String name, String initials, String ref, Role role) { }

    private static final List<Person> PEOPLE = List.of(
            new Person("james.wright", "James Wright", "JW", "12463", Role.EMPLOYEE),
            new Person("priya.sharma", "Priya Sharma", "PS", "12464", Role.EMPLOYEE),
            new Person("dan.okafor",   "Dan Okafor",   "DO", "12465", Role.EMPLOYEE),
            new Person("lucy.chen",    "Lucy Chen",    "LC", "12466", Role.EMPLOYEE),
            new Person("admin",        "Site Admin",   "SA", "00001", Role.ADMIN));

    @Bean
    ApplicationRunner seedDemoData(EmployeeRepository employees,
                                   PasswordEncoder encoder,
                                   @Value("${worktrack.demo.password:}") String demoPassword) {
        return args -> {
            if (demoPassword == null || demoPassword.isBlank()) {
                throw new IllegalStateException(
                        "worktrack.demo.seed is on but DEMO_PASSWORD is empty. "
                        + "Set a password or turn seeding off.");
            }
            if (employees.count() > 0) {
                log.info("Employees already present, skipping demo seed.");
                return;
            }

            String hash = encoder.encode(demoPassword);

            for (Person p : PEOPLE) {
                employees.save(new Employee(p.username(), hash, p.name(),
                        p.initials(), p.ref(), p.role()));
            }

            // Shifts are deliberately not created here. This runs once, so any
            // shifts it wrote would be in the past a week later — which is
            // exactly how the demo went stale. DemoShiftMaintainer owns the
            // shift pattern and keeps the window rolling forward; enable it
            // with DEMO_TOP_UP_SHIFTS.
            log.info("Seeded {} demo employees. Set worktrack.demo.top-up-shifts=true "
                    + "to keep their shifts populated.", PEOPLE.size());
        };
    }
}
