package com.worktrack;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.worktrack.domain.Role;
import com.worktrack.repo.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static com.worktrack.TestFixtures.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestFixtures.class)
class ApiSecurityTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired EmployeeRepository employees;
    @Autowired ShiftRepository shifts;
    @Autowired WorkSessionRepository sessions;
    @Autowired PasswordEncoder encoder;

    @BeforeEach
    void setUp() {
        wipe();
        employee(employees, encoder, "alice", Role.EMPLOYEE);
        employee(employees, encoder, "boss",  Role.ADMIN);
    }

    /**
     * These tests drive the app through MockMvc rather than inside a
     * transaction, so their writes commit. The in-memory database is shared
     * with the other test classes, so this class clears up after itself
     * instead of leaving rows behind for them to collide with.
     */
    @AfterEach
    void tearDown() {
        wipe();
    }

    private void wipe() {
        sessions.deleteAll();
        shifts.deleteAll();
        employees.deleteAll();
    }

    private String login(String user, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"%s","password":"%s"}""".formatted(user, password)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    @Test
    void loginWithCorrectCredentialsReturnsAToken() throws Exception {
        String token = login("alice", "correct-horse");
        assertThat(token).isNotBlank().contains(".");
    }

    @Test
    void loginWithWrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"alice","password":"wrong"}"""))
                .andExpect(status().isUnauthorized());
    }

    /**
     * A different message for "no such user" would let anyone test which
     * usernames exist, so both cases must read identically.
     */
    @Test
    void unknownUserAndWrongPasswordAreIndistinguishable() throws Exception {
        String wrongPass = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"alice","password":"wrong"}"""))
                .andReturn().getResponse().getContentAsString();

        String noSuchUser = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"nobody","password":"wrong"}"""))
                .andReturn().getResponse().getContentAsString();

        assertThat(wrongPass).isEqualTo(noSuchUser);
    }

    @Test
    void passwordIsStoredOnlyAsAHash() {
        String stored = employees.findByUsername("alice").orElseThrow().getPasswordHash();
        assertThat(stored).doesNotContain("correct-horse").startsWith("$2");
    }

    @Test
    void protectedEndpointsRejectAnonymousCallers() throws Exception {
        mvc.perform(get("/api/shifts")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/sessions/clock-in")).andExpect(status().isUnauthorized());
    }

    @Test
    void aGarbageTokenIsRejected() throws Exception {
        mvc.perform(get("/api/shifts").header("Authorization", "Bearer not-a-real-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anEmployeeTokenOpensTheEmployeeEndpoints() throws Exception {
        String token = login("alice", "correct-horse");
        mvc.perform(get("/api/shifts").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void anEmployeeMayNotReachTheAdminEndpoints() throws Exception {
        String token = login("alice", "correct-horse");
        mvc.perform(get("/api/admin/sessions/live").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void anAdminMay() throws Exception {
        String token = login("boss", "correct-horse");
        mvc.perform(get("/api/admin/sessions/live").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void clockingInWithNoShiftTodayReturns404WithAMessage() throws Exception {
        String token = login("alice", "correct-horse");
        mvc.perform(post("/api/sessions/clock-in").header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("You have no shift scheduled today."));
    }

    @Test
    void clockInThenCurrentSessionThenClockOut() throws Exception {
        var alice = employees.findByUsername("alice").orElseThrow();
        shiftOn(shifts, alice, today());
        String token = login("alice", "correct-horse");

        mvc.perform(post("/api/sessions/clock-in").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(true));

        mvc.perform(get("/api/sessions/current").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeName").value("Test alice"));

        mvc.perform(post("/api/sessions/clock-out").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.open").value(false))
                .andExpect(jsonPath("$.endedBy").value("SELF"));
    }

    @Test
    void currentSessionIs204WhenNotClockedIn() throws Exception {
        String token = login("alice", "correct-horse");
        mvc.perform(get("/api/sessions/current").header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    void loginRequiresAUsernameAndPassword() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"","password":""}"""))
                .andExpect(status().isBadRequest());
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }
}
