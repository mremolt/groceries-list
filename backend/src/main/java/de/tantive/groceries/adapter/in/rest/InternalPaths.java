package de.tantive.groceries.adapter.in.rest;

import java.net.URI;

/** Redirect targets after login must be internal paths (TS-SEC-03): no scheme, no host, no protocol-relative URL. */
final class InternalPaths {

    private InternalPaths() {}

    static boolean isInternal(String target) {
        if (target.isEmpty() || target.charAt(0) != '/' || target.startsWith("//") || target.contains("\\")) {
            return false;
        }
        try {
            URI uri = URI.create(target);
            return uri.getScheme() == null && uri.getHost() == null && uri.getAuthority() == null;
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }

    static String orRoot(String target) {
        return isInternal(target) ? target : "/";
    }
}
