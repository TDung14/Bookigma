package com.bookigma.bookigma;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BookigmaApplication {

	public static void main(String[] args) {
		SpringApplication.run(BookigmaApplication.class, args);
	}

}
