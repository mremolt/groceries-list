package de.tantive.groceries.adapter.in.rest;

import de.tantive.groceries.domain.AccessDeniedException;
import de.tantive.groceries.domain.BusinessRuleException;
import de.tantive.groceries.domain.ConflictException;
import de.tantive.groceries.domain.DomainValidationException;
import de.tantive.groceries.domain.ListNotFoundException;
import de.tantive.groceries.domain.NotFoundException;
import de.tantive.groceries.domain.ShareLinkInvalidException;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * The one place that turns exceptions into {@code application/problem+json} (SPRING-REST-07, API-REST-05/06/07). Business
 * exceptions are classified by their base type from {@code domain} (SPRING-ARCH-18). Every problem carries a stable
 * {@code code}; {@code title} and {@code detail} are German texts from {@code messages_de.properties} (SPRING-I18N-02/03).
 */
@RestControllerAdvice
class RestExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(RestExceptionHandler.class);

    private final MessageSource messages;

    RestExceptionHandler(MessageSource messages) {
        this.messages = messages;
        setMessageSource(messages);
    }

    @ExceptionHandler(DomainValidationException.class)
    ResponseEntity<Object> validation(DomainValidationException exception, WebRequest request) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", exception.getMessage());
        String field = exception.field();
        problem.setProperty(
                "errors",
                List.of(
                        field == null
                                ? Map.of("code", exception.code())
                                : Map.of("code", exception.code(), "field", field)));
        return respond(exception, problem, request);
    }

    @ExceptionHandler(NotFoundException.class)
    ResponseEntity<Object> notFound(NotFoundException exception, WebRequest request) {
        if (exception instanceof ListNotFoundException) {
            // a refusal and a miss look the same to the client; the audit event records who asked (SPRING-SEC-22)
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof AppOidcUser user) {
                AuditLog.listAccessRefused(user.toCaller().userId());
            }
        }
        if (exception instanceof ShareLinkInvalidException) {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            AuditLog.shareLinkRefused(
                    authentication != null && authentication.getPrincipal() instanceof AppOidcUser user
                            ? user.toCaller().userId()
                            : null);
        }
        return respond(exception, problem(HttpStatus.NOT_FOUND, exception.code(), exception.getMessage()), request);
    }

    @ExceptionHandler(ConflictException.class)
    ResponseEntity<Object> conflict(ConflictException exception, WebRequest request) {
        return respond(exception, problem(HttpStatus.CONFLICT, exception.code(), exception.getMessage()), request);
    }

    @ExceptionHandler(BusinessRuleException.class)
    ResponseEntity<Object> businessRule(BusinessRuleException exception, WebRequest request) {
        return respond(
                exception,
                problem(HttpStatus.UNPROCESSABLE_CONTENT, exception.code(), exception.getMessage()),
                request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<Object> accessDenied(AccessDeniedException exception, WebRequest request) {
        return respond(exception, problem(HttpStatus.FORBIDDEN, exception.code(), exception.getMessage()), request);
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<Object> optimisticLock(ObjectOptimisticLockingFailureException exception, WebRequest request) {
        return respond(exception, problem(HttpStatus.CONFLICT, "CONFLICT", null), request);
    }

    /** Anything else is a bug: generic 500, no exception text, logged once here (SPRING-SEC-18, SPRING-LOG-07). */
    @ExceptionHandler(Exception.class)
    ResponseEntity<Object> unexpected(Exception exception, WebRequest request) {
        LOG.error("Unhandled exception", exception);
        return respond(exception, problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", null), request);
    }

    @Override
    protected @Nullable ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", null);
        problem.setProperty(
                "errors",
                exception.getBindingResult().getFieldErrors().stream()
                        .map(error -> Map.of("field", error.getField(), "code", String.valueOf(error.getCode())))
                        .toList());
        return handleExceptionInternal(exception, problem, headers, status, request);
    }

    /** Spring's own mappings (404 for a missing file, 405, 415, malformed body, ...) get a stable code, too. */
    @Override
    protected @Nullable ResponseEntity<Object> handleExceptionInternal(
            Exception exception,
            @Nullable Object body,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request) {
        Object effective = body;
        if (effective == null && exception instanceof ErrorResponse errorResponse) {
            effective = errorResponse.updateAndGetBody(messages, LocaleContextHolder.getLocale());
        }
        if (effective instanceof ProblemDetail problem) {
            Map<String, Object> properties = problem.getProperties();
            if (properties == null || !properties.containsKey("code")) {
                problem.setProperty("code", defaultCode(statusCode));
            }
            localize(problem);
            String traceId = MDC.get("traceId");
            if (traceId != null) {
                problem.setProperty("traceId", traceId);
            }
            // the headers of an ErrorResponse are read-only: copy before adding Content-Language
            HttpHeaders writable = new HttpHeaders();
            writable.putAll(headers);
            writable.set(HttpHeaders.CONTENT_LANGUAGE, Locale.GERMAN.toLanguageTag());
            return super.handleExceptionInternal(exception, effective, writable, statusCode, request);
        }
        return super.handleExceptionInternal(exception, effective, headers, statusCode, request);
    }

    private ResponseEntity<Object> respond(Exception exception, ProblemDetail problem, WebRequest request) {
        ResponseEntity<Object> response = handleExceptionInternal(
                exception, problem, new HttpHeaders(), HttpStatus.valueOf(problem.getStatus()), request);
        if (response == null) {
            throw new IllegalStateException("no response for " + problem.getStatus());
        }
        return response;
    }

    private ProblemDetail problem(HttpStatus status, String code, @Nullable String detail) {
        ProblemDetail problem = ProblemDetail.forStatus(status);
        problem.setProperty("code", code);
        if (detail != null) {
            problem.setDetail(detail);
        }
        return problem;
    }

    private void localize(ProblemDetail problem) {
        Map<String, Object> properties = problem.getProperties();
        Object code = properties == null ? null : properties.get("code");
        if (code == null) {
            return;
        }
        Locale locale = LocaleContextHolder.getLocale();
        String title = messages.getMessage("error." + code + ".title", null, null, locale);
        if (title != null) {
            problem.setTitle(title);
        }
        String detail = messages.getMessage("error." + code + ".detail", null, null, locale);
        if (detail != null) {
            problem.setDetail(detail);
        }
    }

    private static String defaultCode(HttpStatusCode status) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return resolved == null ? "ERROR" : resolved.name();
    }
}
