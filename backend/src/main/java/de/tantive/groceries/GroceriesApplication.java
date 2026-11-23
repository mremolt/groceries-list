package de.tantive.groceries;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Composition root (ARCH-ORG-08): the only class that may see every ring. */
@SpringBootApplication
public class GroceriesApplication {

    public static void main(String[] args) {
        SpringApplication.run(GroceriesApplication.class, args);
    }
}
