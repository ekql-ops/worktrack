package com.worktrack.web;

import com.worktrack.domain.Employee;
import com.worktrack.repo.EmployeeRepository;
import org.springframework.stereotype.Component;

import java.security.Principal;

/** Resolves the authenticated principal to the Employee row it refers to. */
@Component
public class CurrentEmployee {

    private final EmployeeRepository employees;

    public CurrentEmployee(EmployeeRepository employees) {
        this.employees = employees;
    }

    public Employee from(Principal principal) {
        return employees.findByUsername(principal.getName())
                .orElseThrow(() -> new IllegalStateException(
                        "Authenticated user has no employee record"));
    }
}
