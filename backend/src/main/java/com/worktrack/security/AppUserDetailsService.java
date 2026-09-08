package com.worktrack.security;

import com.worktrack.domain.Employee;
import com.worktrack.repo.EmployeeRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppUserDetailsService implements UserDetailsService {

    private final EmployeeRepository employees;

    public AppUserDetailsService(EmployeeRepository employees) {
        this.employees = employees;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        Employee e = employees.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("No such user"));
        return User.withUsername(e.getUsername())
                .password(e.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + e.getRole().name())))
                .disabled(!e.isActive())
                .build();
    }
}
