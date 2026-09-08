package com.worktrack.web;

import com.worktrack.domain.Employee;
import com.worktrack.repo.EmployeeRepository;
import com.worktrack.security.TokenService;
import com.worktrack.web.dto.Dtos.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final EmployeeRepository employees;
    private final TokenService tokens;

    public AuthController(AuthenticationManager authManager, EmployeeRepository employees,
                          TokenService tokens) {
        this.authManager = authManager;
        this.employees = employees;
        this.tokens = tokens;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        try {
            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        } catch (AuthenticationException e) {
            // Deliberately the same message whether the username exists or
            // not, so the endpoint cannot be used to enumerate accounts.
            return ResponseEntity.status(401)
                    .body(new ErrorResponse("Username or password is incorrect."));
        }
        Employee employee = employees.findByUsername(req.username()).orElseThrow();
        String token = tokens.issue(employee);
        return ResponseEntity.ok(new LoginResponse(
                token, tokens.ttl().toSeconds(), MeResponse.of(employee)));
    }

    @GetMapping("/me")
    public MeResponse me(Principal principal) {
        return MeResponse.of(employees.findByUsername(principal.getName()).orElseThrow());
    }
}
