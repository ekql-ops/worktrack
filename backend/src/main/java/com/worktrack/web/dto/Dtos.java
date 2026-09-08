package com.worktrack.web.dto;

import com.worktrack.domain.*;
import jakarta.validation.constraints.NotBlank;

import java.time.*;
import java.util.UUID;

public final class Dtos {

    private Dtos() { }

    public record LoginRequest(@NotBlank String username, @NotBlank String password) { }

    public record LoginResponse(String token, long expiresInSeconds, MeResponse user) { }

    public record MeResponse(UUID id, String username, String fullName, String initials,
                             String employeeRef, Role role) {
        public static MeResponse of(Employee e) {
            return new MeResponse(e.getId(), e.getUsername(), e.getFullName(),
                    e.getInitials(), e.getEmployeeRef(), e.getRole());
        }
    }

    public record ShiftResponse(UUID id, LocalDate date, LocalTime startTime, LocalTime endTime,
                                String grade, String location, boolean isToday) {
        public static ShiftResponse of(Shift s, LocalDate today) {
            return new ShiftResponse(s.getId(), s.getDate(), s.getStartTime(), s.getEndTime(),
                    s.getGrade(), s.getLocation(), s.getDate().equals(today));
        }
    }

    public record SessionResponse(UUID id, UUID employeeId, String employeeName, String initials,
                                  UUID shiftId, LocalDate shiftDate, LocalTime shiftEnd,
                                  Instant clockInAt, Instant clockOutAt, EndedBy endedBy,
                                  boolean open, boolean overrunning) {
        public static SessionResponse of(WorkSession s, boolean overrunning) {
            return new SessionResponse(
                    s.getId(), s.getEmployee().getId(), s.getEmployee().getFullName(),
                    s.getEmployee().getInitials(), s.getShift().getId(), s.getShift().getDate(),
                    s.getShift().getEndTime(), s.getClockInAt(), s.getClockOutAt(),
                    s.getEndedBy(), s.isOpen(), overrunning);
        }
    }

    public record ErrorResponse(String error) { }
}
