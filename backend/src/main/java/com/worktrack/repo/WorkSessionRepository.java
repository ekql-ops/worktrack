package com.worktrack.repo;

import com.worktrack.domain.WorkSession;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Responses are built after the transaction has closed and open-in-view is
 * off, so every finder that feeds one fetches its employee and shift up
 * front. Without the graphs these lazy associations raise
 * LazyInitializationException at serialisation time.
 */
public interface WorkSessionRepository extends JpaRepository<WorkSession, UUID> {

    @EntityGraph(attributePaths = {"employee", "shift"})
    Optional<WorkSession> findByEmployeeIdAndClockOutAtIsNull(UUID employeeId);

    @EntityGraph(attributePaths = {"employee", "shift"})
    List<WorkSession> findByClockOutAtIsNullOrderByClockInAtAsc();

    @EntityGraph(attributePaths = {"employee", "shift"})
    List<WorkSession> findByEmployeeIdOrderByClockInAtDesc(UUID employeeId);

    @EntityGraph(attributePaths = {"employee", "shift"})
    List<WorkSession> findAllByOrderByClockInAtDesc();

    @EntityGraph(attributePaths = {"employee", "shift"})
    Optional<WorkSession> findWithDetailsById(UUID id);
}
