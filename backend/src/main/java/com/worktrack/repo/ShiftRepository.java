package com.worktrack.repo;

import com.worktrack.domain.Shift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftRepository extends JpaRepository<Shift, UUID> {

    List<Shift> findByEmployeeIdAndDateGreaterThanEqualOrderByDateAsc(UUID employeeId, LocalDate from);

    Optional<Shift> findByEmployeeIdAndDate(UUID employeeId, LocalDate date);
}
