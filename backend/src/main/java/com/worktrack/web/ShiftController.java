package com.worktrack.web;

import com.worktrack.service.ClockService;
import com.worktrack.web.dto.Dtos.ShiftResponse;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/shifts")
public class ShiftController {

    private final ClockService clocks;
    private final CurrentEmployee current;

    public ShiftController(ClockService clocks, CurrentEmployee current) {
        this.clocks = clocks;
        this.current = current;
    }

    @GetMapping
    public List<ShiftResponse> myShifts(Principal principal) {
        LocalDate today = clocks.today();
        return clocks.upcomingShifts(current.from(principal).getId()).stream()
                .map(s -> ShiftResponse.of(s, today))
                .toList();
    }
}
