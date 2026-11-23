package de.tantive.groceries.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashSet;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class ShareTokenTest {

    @Test
    void aGeneratedTokenHas256BitsAsUrlSafeBase64() {
        ShareToken token = ShareToken.generate();

        assertThat(token.value()).hasSize(43).matches("[A-Za-z0-9_-]+");
    }

    @Test
    void generatedTokensDoNotRepeat() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 1_000; i++) {
            seen.add(ShareToken.generate().value());
        }

        assertThat(seen).hasSize(1_000);
    }

    @Test
    void aGeneratedTokenSurvivesParsing() {
        ShareToken token = ShareToken.generate();

        assertThat(ShareToken.parse(" " + token.value() + "\n")).isEqualTo(token);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(
            strings = {
                " ",
                "short",
                "has spaces in it but is long enough",
                "üüüüüüüüüüüüüüüüüüüü",
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "../../etc/passwd/..."
            })
    void everythingElseIsAnInvalidLinkNotABadRequest(String candidate) {
        assertThatThrownBy(() -> ShareToken.parse(candidate)).isInstanceOf(ShareLinkInvalidException.class);
    }

    @Test
    void theTokenNeverShowsInToString() {
        ShareToken token = ShareToken.generate();

        assertThat(token.toString()).doesNotContain(token.value());
    }
}
