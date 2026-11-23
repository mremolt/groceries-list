package de.tantive.groceries.adapter.out.http;

import de.tantive.groceries.ports.out.IdentityProviderPort;
import de.tantive.groceries.ports.out.IdentityProviderUnavailableException;
import de.tantive.groceries.stereotype.HttpClientAdapter;
import java.net.http.HttpClient;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Deletes accounts through Keycloak's admin API with a service account (client credentials; SPRING-SEC-41). Every call
 * has explicit connect and read timeouts (RES-TMO-01) and nothing is retried here: the caller keeps the work in an
 * outbox. A user that does not exist any more counts as deleted, which makes the call idempotent. The subject is
 * never logged (SPRING-LOG-08).
 */
@HttpClientAdapter
final class KeycloakAdminAdapter implements IdentityProviderPort {

    private static final ParameterizedTypeReference<Map<String, Object>> TOKEN_RESPONSE =
            new ParameterizedTypeReference<>() {};

    private final KeycloakAdminProperties properties;
    private final RestClient client;
    private final String tokenUri;
    private final String usersUri;

    KeycloakAdminAdapter(KeycloakAdminProperties properties, RestClient.Builder builder) {
        this.properties = properties;
        HttpClient http = HttpClient.newBuilder()
                .connectTimeout(properties.connectTimeout())
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(properties.readTimeout());
        this.client = builder.requestFactory(factory).build();
        String issuer = properties.issuerUri().replaceAll("/+$", "");
        int realms = issuer.lastIndexOf("/realms/");
        if (realms < 0) {
            throw new IllegalStateException("app.idp-admin.issuer-uri must look like <base>/realms/<realm>");
        }
        this.tokenUri = issuer + "/protocol/openid-connect/token";
        this.usersUri = issuer.substring(0, realms) + "/admin/realms/" + issuer.substring(realms + "/realms/".length())
                + "/users/{id}";
    }

    @Override
    public void deleteUser(String subject) throws IdentityProviderUnavailableException {
        try {
            String token = accessToken();
            client.delete()
                    .uri(usersUri, subject)
                    .headers(headers -> headers.setBearerAuth(token))
                    .retrieve()
                    .onStatus(status -> status.value() == 404, (request, response) -> {})
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            throw new IdentityProviderUnavailableException(
                    "Identity provider answered "
                            + HttpStatusCode.valueOf(e.getStatusCode().value()),
                    e);
        } catch (RestClientException e) {
            throw new IdentityProviderUnavailableException("Identity provider not reachable", e);
        }
    }

    private String accessToken() throws IdentityProviderUnavailableException {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        Map<String, Object> response = client.post()
                .uri(tokenUri)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .headers(headers -> headers.setBasicAuth(
                        properties.clientId(), properties.clientSecret().reveal()))
                .body(form)
                .retrieve()
                .body(TOKEN_RESPONSE);
        Object token = response == null ? null : response.get("access_token");
        if (!(token instanceof String text) || text.isBlank()) {
            throw new IdentityProviderUnavailableException("Identity provider issued no admin token");
        }
        return text;
    }
}
