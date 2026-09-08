package com.worktrack.domain;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "shifts")
public class Shift {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "shift_date", nullable = false)
    private LocalDate date;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    private String grade;
    private String location;

    protected Shift() { }

    public Shift(Employee employee, LocalDate date, LocalTime startTime,
                 LocalTime endTime, String grade, String location) {
        this.employee = employee;
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.grade = grade;
        this.location = location;
    }

    public UUID getId()          { return id; }
    public Employee getEmployee(){ return employee; }
    public LocalDate getDate()   { return date; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime()   { return endTime; }
    public String getGrade()     { return grade; }
    public String getLocation()  { return location; }
}
