package com.worktrack.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "employees")
public class Employee {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(nullable = false, unique = true)
    private String username;

    /** BCrypt hash. The plain password is never stored or logged. */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String initials;

    @Column(name = "employee_ref", nullable = false, unique = true)
    private String employeeRef;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.EMPLOYEE;

    @Column(nullable = false)
    private boolean active = true;

    protected Employee() { }

    public Employee(String username, String passwordHash, String fullName,
                    String initials, String employeeRef, Role role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.initials = initials;
        this.employeeRef = employeeRef;
        this.role = role;
    }

    public UUID getId()           { return id; }
    public String getUsername()   { return username; }
    public String getPasswordHash() { return passwordHash; }
    public String getFullName()   { return fullName; }
    public String getInitials()   { return initials; }
    public String getEmployeeRef(){ return employeeRef; }
    public Role getRole()         { return role; }
    public boolean isActive()     { return active; }

    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setActive(boolean active)            { this.active = active; }
}
