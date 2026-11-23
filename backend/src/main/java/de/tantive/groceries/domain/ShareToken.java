package de.tantive.groceries.domain;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * The secret in a share link (BR-06, ADR 0008): 32 bytes from a CSPRNG, base64url without padding (256 bits), unrelated
 * to any id. Whoever has it can join the list, so it is never logged and appears only in request bodies and the link
 * itself (NFR-SEC-05). Anything that does not look like a token is an invalid link, not a bad request: the answer for
 * a wrong guess is one and the same (FR-SHARE-04 AC2).
 */
public record ShareToken(String value) {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern FORMAT = Pattern.compile("[A-Za-z0-9_-]{16,64}");
    private static final int BYTES = 32;

    public ShareToken {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new ShareLinkInvalidException();
        }
    }

    public static ShareToken generate() {
        byte[] bytes = new byte[BYTES];
        RANDOM.nextBytes(bytes);
        return new ShareToken(Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
    }

    /** A token as a client sent it: null, empty or malformed means an invalid link. */
    public static ShareToken parse(@Nullable String candidate) {
        return new ShareToken(candidate == null ? "" : candidate.strip());
    }

    /** Hidden from {@code toString()} so a token cannot reach a log through string concatenation (SPRING-LOG-08). */
    @Override
    public String toString() {
        return "ShareToken[redacted]";
    }
}
