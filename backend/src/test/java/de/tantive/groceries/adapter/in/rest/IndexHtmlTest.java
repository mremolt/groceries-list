package de.tantive.groceries.adapter.in.rest;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

/** Chicago style: a pure function from template and nonce to HTML (TEST-TDD-10), against a production-build shape. */
class IndexHtmlTest {

    private static final String NONCE = "abc123Nonce";

    private final IndexHtml index = new IndexHtml(read());

    @Test
    void replacesEveryPlaceholder() {
        assertThat(index.render(NONCE)).doesNotContain("CSP_NONCE").contains("ngCspNonce=\"" + NONCE + "\"");
    }

    @Test
    void addsANonceToAnInlineScriptThatHasNone() {
        assertThat(index.render(NONCE)).contains("<script nonce=\"" + NONCE + "\">window.__fixtureInlineWithoutNonce");
    }

    @Test
    void neverWritesTwoNonceAttributesOnOneTag() {
        Pattern twice =
                Pattern.compile("<(script|style|link)\\b[^>]*\\snonce=[^>]*\\snonce=", Pattern.CASE_INSENSITIVE);

        assertThat(index.render(NONCE)).doesNotContainPattern(twice);
    }

    @Test
    void leavesAnIconLinkAlone() {
        assertThat(index.render(NONCE)).contains("<link rel=\"icon\" type=\"image/x-icon\" href=\"favicon.ico\">");
    }

    @Test
    void usesADifferentNonceForEveryRender() {
        assertThat(index.render("one")).isNotEqualTo(index.render("two"));
    }

    @Test
    void rendersTheRealProductionBuildWithoutPlaceholderOrDoubleNonce() {
        String html = new IndexHtml(read("real-build/index.html")).render(NONCE);

        assertThat(html).doesNotContain("CSP_NONCE").contains("nonce=\"" + NONCE + "\"");
        assertThat(html)
                .doesNotContainPattern(Pattern.compile(
                        "<(script|style|link)\\b[^>]*\\snonce=[^>]*\\snonce=", Pattern.CASE_INSENSITIVE));
    }

    private static String read() {
        return read("frontend/index.html");
    }

    private static String read(String resource) {
        try {
            return new String(new ClassPathResource(resource).getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
