package de.tantive.groceries.adapter.in.rest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import tools.jackson.databind.json.JsonMapper;

/**
 * Problem details (RFC 9457) for errors produced outside the controllers: the filter chains and servlet filters
 * (SPRING-REST-14).
 */
final class ProblemJson {

    private ProblemJson() {}

    static void write(JsonMapper mapper, HttpServletResponse response, HttpStatus status, String code, String title)
            throws IOException {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setTitle(title);
        problem.setProperty("code", code);
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setHeader("Cache-Control", "no-store");
        mapper.writeValue(response.getOutputStream(), problem);
    }

    static AuthenticationEntryPoint unauthorized(JsonMapper mapper) {
        return (HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) ->
                write(mapper, response, HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Anmeldung erforderlich");
    }

    static AccessDeniedHandler forbidden(JsonMapper mapper) {
        return (HttpServletRequest request, HttpServletResponse response, AccessDeniedException exception) ->
                write(mapper, response, HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Zugriff verweigert");
    }
}
