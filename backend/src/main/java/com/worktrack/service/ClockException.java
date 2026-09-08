package com.worktrack.service;

/**
 * A clock-in or clock-out that the rules do not allow. Carries the HTTP
 * status so the web layer does not have to re-derive it from the message.
 */
public class ClockException extends RuntimeException {

    private final int status;

    private ClockException(String message, int status) {
        super(message);
        this.status = status;
    }

    public int getStatus() { return status; }

    public static ClockException noShiftToday() {
        return new ClockException("You have no shift scheduled today.", 404);
    }

    public static ClockException alreadyClockedIn() {
        return new ClockException("You are already clocked in.", 409);
    }

    public static ClockException notClockedIn() {
        return new ClockException("You are not clocked in.", 409);
    }

    public static ClockException sessionAlreadyClosed() {
        return new ClockException("That session is already closed.", 409);
    }

    public static ClockException sessionNotFound() {
        return new ClockException("Session not found.", 404);
    }
}
