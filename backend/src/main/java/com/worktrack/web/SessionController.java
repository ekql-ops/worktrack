package com.worktrack.web;

import com.worktrack.domain.WorkSession;
import com.worktrack.service.ClockService;
import com.worktrack.web.dto.Dtos.SessionResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final ClockService clocks;
    private final CurrentEmployee current;

    public SessionController(ClockService clocks, CurrentEmployee current) {
        this.clocks = clocks;
        this.current = current;
    }

    /** The employee's open session, or 204 when they are not clocked in. */
    @GetMapping("/current")
    public ResponseEntity<SessionResponse> currentSession(Principal principal) {
        return clocks.openSession(current.from(principal).getId())
                .map(s -> ResponseEntity.ok(SessionResponse.of(s, clocks.isOverrunning(s))))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/clock-in")
    public SessionResponse clockIn(Principal principal) {
        WorkSession s = clocks.clockIn(current.from(principal).getId());
        return SessionResponse.of(s, clocks.isOverrunning(s));
    }

    @PostMapping("/clock-out")
    public SessionResponse clockOut(Principal principal) {
        WorkSession s = clocks.clockOut(current.from(principal).getId());
        return SessionResponse.of(s, false);
    }

    @GetMapping("/history")
    public List<SessionResponse> myHistory(Principal principal) {
        return clocks.historyFor(current.from(principal).getId()).stream()
                .map(s -> SessionResponse.of(s, clocks.isOverrunning(s)))
                .toList();
    }
}
