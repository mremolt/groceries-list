package de.tantive.groceries.adapter.in.rest;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jose.util.DefaultResourceRetriever;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import de.tantive.groceries.ports.in.ProvideUserCommand;
import de.tantive.groceries.ports.in.ProvideUserResult;
import de.tantive.groceries.ports.in.ProvideUserUseCase;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.endpoint.OAuth2AccessTokenResponseClient;
import org.springframework.security.oauth2.client.endpoint.OAuth2AuthorizationCodeGrantRequest;
import org.springframework.security.oauth2.client.endpoint.RestClientAuthorizationCodeTokenResponseClient;
import org.springframework.security.oauth2.client.http.OAuth2ErrorResponseErrorHandler;
import org.springframework.security.oauth2.client.oidc.authentication.OidcIdTokenDecoderFactory;
import org.springframework.security.oauth2.client.oidc.authentication.OidcIdTokenValidator;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.converter.ClaimTypeConverter;
import org.springframework.security.oauth2.core.http.converter.OAuth2AccessTokenResponseHttpMessageConverter;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.jwt.JwtDecoderFactory;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.web.client.RestClient;

/**
 * The OIDC client of the BFF (ADR 0002, SPRING-SEC-08/38). The registration is built from {@link AuthProperties}
 * without discovery, so start-up needs no network. Every call to the IdP has explicit connect and read timeouts
 * (RES-TMO-01, SPRING-RES-01): the token request and the JWKS fetch. The user-info call is not used: the claims come
 * from the ID token.
 */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties({AuthProperties.class, RateLimitProperties.class})
class AuthConfiguration {

    static final String REGISTRATION_ID = "keycloak";

    @Bean
    ClientRegistrationRepository clientRegistrationRepository(AuthProperties properties) {
        String issuer = properties.issuerUri().replaceAll("/+$", "");
        String openid = issuer + "/protocol/openid-connect";
        ClientRegistration registration = ClientRegistration.withRegistrationId(REGISTRATION_ID)
                .clientId(properties.clientId())
                .clientSecret(properties.clientSecret().reveal())
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
                .scope("openid", "profile", "email")
                .authorizationUri(openid + "/auth")
                .tokenUri(openid + "/token")
                .jwkSetUri(openid + "/certs")
                .issuerUri(issuer)
                .userNameAttributeName("sub")
                .clientName("Keycloak")
                .providerConfigurationMetadata(Map.of("end_session_endpoint", openid + "/logout"))
                .build();
        return new InMemoryClientRegistrationRepository(registration);
    }

    /** The token request uses the auto-configured builder: connect and read timeouts come from the client floor (SPRING-RES-01). */
    @Bean
    OAuth2AccessTokenResponseClient<OAuth2AuthorizationCodeGrantRequest> accessTokenResponseClient(
            RestClient.Builder builder) {
        RestClientAuthorizationCodeTokenResponseClient client = new RestClientAuthorizationCodeTokenResponseClient();
        client.setRestClient(builder.configureMessageConverters(converters ->
                        converters.addCustomConverter(new OAuth2AccessTokenResponseHttpMessageConverter()))
                .defaultStatusHandler(new OAuth2ErrorResponseErrorHandler())
                .build());
        return client;
    }

    /** ID tokens are verified against the IdP's keys, fetched with explicit timeouts and cached by Nimbus. */
    @Bean
    JwtDecoderFactory<ClientRegistration> idTokenDecoderFactory(AuthProperties properties) {
        return registration -> {
            NimbusJwtDecoder decoder = nimbus(
                    Objects.requireNonNull(registration.getProviderDetails().getJwkSetUri(), "jwkSetUri"), properties);
            decoder.setJwtValidator(new OidcIdTokenValidator(registration));
            decoder.setClaimSetConverter(
                    new ClaimTypeConverter(OidcIdTokenDecoderFactory.createDefaultClaimTypeConverters()));
            return decoder;
        };
    }

    /** Claims from the ID token only; the product's account is provided at every login (ProvideUserUseCase). */
    @Bean
    OAuth2UserService<OidcUserRequest, OidcUser> oidcUserService(ProvideUserUseCase provideUser) {
        OidcUserService delegate = new OidcUserService();
        delegate.setRetrieveUserInfo(request -> false);
        return request -> {
            OidcUser oidc = delegate.loadUser(request);
            ProvideUserResult user = provideUser.provide(new ProvideUserCommand(
                    Objects.requireNonNull(oidc.getSubject(), "sub"),
                    orEmpty(oidc.getEmail()),
                    orEmpty(oidc.getClaimAsString("displayName"))));
            return new AppOidcUser(
                    oidc.getAuthorities(), oidc.getIdToken(), user.userId(), user.email(), user.displayName());
        };
    }

    private static String orEmpty(@Nullable String value) {
        return Optional.ofNullable(value).orElse("");
    }

    static URL url(String value) {
        try {
            return URI.create(value).toURL();
        } catch (MalformedURLException e) {
            throw new IllegalStateException("Invalid IdP URL", e);
        }
    }

    static JWKSource<SecurityContext> jwkSource(String jwkSetUri, AuthProperties properties) {
        DefaultResourceRetriever retriever =
                new DefaultResourceRetriever((int) properties.connectTimeout().toMillis(), (int)
                        properties.readTimeout().toMillis());
        return JWKSourceBuilder.create(url(jwkSetUri), retriever).build();
    }

    static NimbusJwtDecoder nimbus(String jwkSetUri, AuthProperties properties) {
        DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
        processor.setJWSKeySelector(
                new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, jwkSource(jwkSetUri, properties)));
        return new NimbusJwtDecoder(processor);
    }
}
