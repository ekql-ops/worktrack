package com.worktrack.web;

import com.worktrack.domain.WorkSession;
import com.worktrack.service.ClockService;
import com.worktrack.web.dto.Dtos.SessionResponse;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final ClockService clocks;

    public AdminController(ClockService clocks) {
        this.clocks = clocks;
    }

    /** Everyone currently on site. */
    @GetMapping("/sessions/live")
    public List<SessionResponse> live() {
        return clocks.liveSessions().stream()
                .map(s -> SessionResponse.of(s, clocks.isOverrunning(s)))
                .toList();
    }

    @GetMapping("/sessions")
    public List<SessionResponse> all() {
        return clocks.allSessions().stream()
                .map(s -> SessionResponse.of(s, clocks.isOverrunning(s)))
                .toList();
    }

    @PostMapping("/sessions/{id}/force-clock-out")
    public SessionResponse forceClockOut(@PathVariable UUID id) {
        WorkSession s = clocks.forceClockOut(id);
        return SessionResponse.of(s, false);
    }
}
