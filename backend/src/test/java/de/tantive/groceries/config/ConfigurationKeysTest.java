package de.tantive.groceries.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.yaml.snakeyaml.Yaml;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** The key list matches the code and required keys have no deployed default (CFG-12, TEST-CFG-04/05). */
class ConfigurationKeysTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    @Test
    void ownKeysInTheCodeAndInTheListAreTheSame() throws IOException {
        Set<String> inCode = new TreeSet<>();
        try (InputStream metadata =
                new ClassPathResource("META-INF/spring-configuration-metadata.json").getInputStream()) {
            for (JsonNode property : JSON.readTree(metadata).path("properties")) {
                String name = property.path("name").asString("");
                if (name.startsWith("app.")) {
                    inCode.add(name);
                }
            }
        }
        Set<String> inList = new TreeSet<>();
        for (Map<String, Object> entry : keyList()) {
            String key = String.valueOf(entry.get("key"));
            if (key.startsWith("app.")) {
                inList.add(key);
            }
        }

        assertThat(inList).as("own app.* keys of configuration-keys.yaml").containsExactlyElementsOf(inCode);
    }

    @Test
    void aRequiredKeyHasNoValueInTheDeployedDefaults() throws IOException {
        Map<String, String> deployed = deployedDefaults();
        List<String> withDefault = new ArrayList<>();
        for (Map<String, Object> entry : keyList()) {
            String key = String.valueOf(entry.get("key"));
            if (Boolean.TRUE.equals(entry.get("required")) && deployed.containsKey(key)) {
                withDefault.add(key);
            }
        }

        assertThat(withDefault)
                .as("required keys that application.yaml gives a value")
                .isEmpty();
    }

    @Test
    void everyEntryDescribesItselfAndSaysIfItIsSecret() {
        for (Map<String, Object> entry : keyList()) {
            assertThat(entry).containsKeys("key", "required", "secret", "description");
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> keyList() {
        try (InputStream stream = new java.io.FileInputStream("configuration-keys.yaml")) {
            Map<String, Object> root = new Yaml().load(stream);
            return (List<Map<String, Object>>) java.util.Objects.requireNonNull(root.get("keys"));
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Flattened {@code application.yaml}: the documents that apply without a profile. */
    private static Map<String, String> deployedDefaults() throws IOException {
        Map<String, String> flat = new HashMap<>();
        try (InputStream stream = new ClassPathResource("application.yaml").getInputStream()) {
            for (Object document : new Yaml().loadAll(stream)) {
                if (document instanceof Map<?, ?> map) {
                    flatten("", map, flat);
                }
            }
        }
        return flat;
    }

    private static void flatten(String prefix, Map<?, ?> map, Map<String, String> into) {
        map.forEach((key, value) -> {
            String name = prefix.isEmpty() ? String.valueOf(key) : prefix + "." + key;
            if (value instanceof Map<?, ?> nested) {
                flatten(name, nested, into);
            } else {
                into.put(name, String.valueOf(value));
            }
        });
    }
}
