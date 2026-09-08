package com.worktrack.security;

import com.worktrack.domain.Employee;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/** Issues the signed token the SPA sends back on every subsequent request. */
@Service
public class TokenService {

    private final JwtEncoder encoder;
    private final Duration ttl;

    public TokenService(JwtEncoder encoder,
                        @org.springframework.beans.factory.annotation.Value("${worktrack.jwt.ttl-minutes:720}") long ttlMinutes) {
        this.encoder = encoder;
        this.ttl = Duration.ofMinutes(ttlMinutes);
    }

    public String issue(Employee employee) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("worktrack")
                .issuedAt(now)
                .expiresAt(now.plus(ttl))
                .subject(employee.getUsername())
                .claim("uid", employee.getId().toString())
                .claim("role", employee.getRole().name())
                .claim("name", employee.getFullName())
                .build();
        // The encoder defaults to RS256; these tokens are signed with a shared
        // secret, so the header has to name the MAC algorithm explicitly or
        // Nimbus finds no key it can use.
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    public Duration ttl() { return ttl; }
}
