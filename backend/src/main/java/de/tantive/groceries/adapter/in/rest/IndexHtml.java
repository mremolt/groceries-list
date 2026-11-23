package de.tantive.groceries.adapter.in.rest;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The {@code index.html} of the embedded Angular bundle with its nonce placeholder (NG-SEC-06). The production build
 * marks its tags with {@code CSP_NONCE} (through {@code ngCspNonce="CSP_NONCE"}); every placeholder is replaced, and a
 * {@code script}, {@code style} or stylesheet/modulepreload {@code link} without a nonce gets one. A tag that already
 * has a nonce attribute is never given a second one: browsers block a script with duplicate attributes.
 */
final class IndexHtml {

    static final String PLACEHOLDER = "CSP_NONCE";

    private static final Pattern TAG = Pattern.compile("<(script|style|link)\\b[^>]*>", Pattern.CASE_INSENSITIVE);
    private static final Pattern NONCE_ATTRIBUTE = Pattern.compile("\\snonce\\s*=", Pattern.CASE_INSENSITIVE);
    private static final Pattern NEEDS_NONCE_LINK =
            Pattern.compile("\\srel\\s*=\\s*[\"']?(stylesheet|modulepreload)", Pattern.CASE_INSENSITIVE);

    private final String template;

    IndexHtml(String template) {
        this.template = template;
    }

    String render(String nonce) {
        String replaced = template.replace(PLACEHOLDER, nonce);
        Matcher matcher = TAG.matcher(replaced);
        StringBuilder result = new StringBuilder(replaced.length() + 128);
        while (matcher.find()) {
            String tag = matcher.group();
            String name = matcher.group(1);
            boolean needsNonce = !NONCE_ATTRIBUTE.matcher(tag).find()
                    && (!name.equalsIgnoreCase("link")
                            || NEEDS_NONCE_LINK.matcher(tag).find());
            String rewritten =
                    needsNonce ? "<" + name + " nonce=\"" + nonce + "\"" + tag.substring(name.length() + 1) : tag;
            matcher.appendReplacement(result, Matcher.quoteReplacement(rewritten));
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
