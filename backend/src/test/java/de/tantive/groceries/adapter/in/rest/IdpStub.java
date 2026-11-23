package de.tantive.groceries.adapter.in.rest;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

/**
 * A minimal identity provider for the login flow test: the token endpoint and the JWKS of a Keycloak realm, signed with
 * a throw-away key. Fictitious data only (DP-ENV-01).
 */
final class IdpStub implements AutoCloseable {

    static final String CLIENT_ID = "groceries-bff";
    private static final String BASE = "/realms/groceries/protocol/openid-connect";

    private final HttpServer server;
    private final RSAKey key;
    private final AtomicReference<String> nextIdToken = new AtomicReference<>("");

    IdpStub() {
        try {
            key = new RSAKeyGenerator(2048).keyID("test-key").generate();
            server = HttpServer.create(new InetSocketAddress(java.net.InetAddress.getLoopbackAddress(), 0), 0);
        } catch (JOSEException | IOException e) {
            throw new IllegalStateException(e);
        }
        server.createContext(BASE + "/certs", exchange -> {
            byte[] body = new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.createContext(BASE + "/token", exchange -> {
            String json =
                    "{\"access_token\":\"access-test\",\"token_type\":\"Bearer\",\"expires_in\":300,\"scope\":\"openid\",\"id_token\":\""
                            + nextIdToken.get() + "\"}";
            byte[] body = json.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    String issuer() {
        return "http://localhost:" + server.getAddress().getPort() + "/realms/groceries";
    }

    RSAKey key() {
        return key;
    }

    /** The ID token the token endpoint hands out next: the claims Keycloak puts into it (ADR 0003). */
    void willIssueIdToken(String subject, String email, String displayName, String sid, String nonce) {
        nextIdToken.set(sign(Map.of(
                "sub", subject,
                "email", email,
                "email_verified", false,
                "displayName", displayName,
                "sid", sid,
                "nonce", nonce)));
    }

    /** As above, with the {@code auth_time} claim Keycloak adds: when the person really typed their credentials. */
    void willIssueIdToken(
            String subject, String email, String displayName, String sid, String nonce, Instant authTime) {
        nextIdToken.set(sign(Map.of(
                "sub", subject,
                "email", email,
                "email_verified", false,
                "displayName", displayName,
                "sid", sid,
                "nonce", nonce,
                "auth_time", authTime.getEpochSecond())));
    }

    /** A signed token with the claims of an OIDC back-channel logout token. */
    String logoutToken(String subject, String sid) {
        return sign(Map.of(
                "sub",
                subject,
                "sid",
                sid,
                "jti",
                UUID.randomUUID().toString(),
                "events",
                Map.of("http://schemas.openid.net/event/backchannel-logout", Map.of())));
    }

    private String sign(Map<String, Object> claims) {
        try {
            JWTClaimsSet.Builder builder = new JWTClaimsSet.Builder()
                    .issuer(issuer())
                    .audience(List.of(CLIENT_ID))
                    .issueTime(Date.from(Instant.now()))
                    .expirationTime(Date.from(Instant.now().plusSeconds(300)));
            claims.forEach(builder::claim);
            SignedJWT jwt = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256)
                            .keyID(key.getKeyID())
                            .build(),
                    builder.build());
            jwt.sign(new RSASSASigner(key));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
