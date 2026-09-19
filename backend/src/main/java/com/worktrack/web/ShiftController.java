package com.worktrack.web;

import com.worktrack.config.DemoShiftMaintainer;
import com.worktrack.service.ClockService;
import com.worktrack.web.dto.Dtos.ShiftResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    private final ClockService clocks;
    private final CurrentEmployee current;

    /**
     * Absent in a real deployment; present only when demo shift top-up is
     * switched on, which is why this is a provider rather than a dependency.
     */
    private final ObjectProvider<DemoShiftMaintainer> demoShifts;

    public ShiftController(ClockService clocks, CurrentEmployee current,
                           ObjectProvider<DemoShiftMaintainer> demoShifts) {
        this.clocks = clocks;
        this.current = current;
        this.demoShifts = demoShifts;
    }

    @GetMapping
    public List<ShiftResponse> myShifts(Principal principal) {
        // Keeps the demo's shift window ahead of today. Does nothing once the
        // window is full, and nothing at all outside demo mode.
        demoShifts.ifAvailable(DemoShiftMaintainer::ensureUpcoming);

        LocalDate today = clocks.today();
        return clocks.upcomingShifts(current.from(principal).getId()).stream()
                .map(s -> ShiftResponse.of(s, today))
                .toList();
    }
}
