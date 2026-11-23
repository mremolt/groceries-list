package de.tantive.groceries.adapter.in.rest;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Creates the per-response nonce, publishes it as a request attribute for {@code index.html} and writes the nonce-based
 * Content-Security-Policy of NG-SEC-05 (SPRING-SEC-13, NG-SEC-06). Trusted Types start in report-only mode until the
 * reports are clean.
 */
final class CspNonceFilter extends OncePerRequestFilter {

    static final String NONCE_ATTRIBUTE = CspNonceFilter.class.getName() + ".NONCE";

    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String nonce = newNonce();
        request.setAttribute(NONCE_ATTRIBUTE, nonce);
        response.setHeader("Content-Security-Policy", policy(nonce));
        response.setHeader(
                "Content-Security-Policy-Report-Only",
                "trusted-types angular angular#bundler angular#components; require-trusted-types-for 'script'; "
                        + "report-to csp; report-uri /csp-reports");
        response.setHeader("Reporting-Endpoints", "csp=\"/csp-reports\"");
        chain.doFilter(request, response);
    }

    static String policy(String nonce) {
        return "default-src 'self'; script-src 'nonce-" + nonce + "' 'strict-dynamic'; style-src 'self' 'nonce-" + nonce
                + "'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; "
                + "base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-to csp; report-uri /csp-reports";
    }

    private static String newNonce() {
        byte[] bytes = new byte[16];
        RANDOM.nextBytes(bytes);
        return Base64.getEncoder().withoutPadding().encodeToString(bytes);
    }
}
